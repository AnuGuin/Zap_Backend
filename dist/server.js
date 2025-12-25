// src/server.ts
import http from "http";
import { Server as Server2 } from "socket.io";

// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// src/config/redis.ts
import { createClient } from "redis";

// src/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GOOGLE_API_KEY: z.string(),
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_LOCATION: z.string().default("us-central1"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional()
});
var env = envSchema.parse(process.env);

// src/utils/logger.ts
var logger = {
  info: (message, meta) => {
    console.log(JSON.stringify({ level: "info", message, meta, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  },
  error: (message, error) => {
    console.error(JSON.stringify({ level: "error", message, error, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  },
  warn: (message, meta) => {
    console.warn(JSON.stringify({ level: "warn", message, meta, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  }
};

// src/config/redis.ts
var redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("Redis reconnection limit reached");
        return new Error("Redis reconnection limit exceeded");
      }
      return Math.min(retries * 100, 3e3);
    },
    connectTimeout: 1e4
  }
});
redisClient.on("error", (err) => logger.error("Redis Client Error", err));
redisClient.on("connect", () => logger.info("Redis client connected"));
redisClient.on("ready", () => logger.info("Redis client ready"));
(async () => {
  if (env.NODE_ENV !== "test") {
    await redisClient.connect();
  }
})();
var redis_default = redisClient;

// src/utils/rateLimiter.ts
var rateLimiter = (limit, windowSeconds) => {
  return async (req, res, next) => {
    const ip = req.ip || "unknown";
    const key = `rate-limit:${ip}`;
    try {
      const requests = await redis_default.incr(key);
      if (requests === 1) {
        await redis_default.expire(key, windowSeconds);
      }
      if (requests > limit) {
        return res.status(429).json({ message: "Too many requests" });
      }
      next();
    } catch (error) {
      console.error("Rate limiter error", error);
      next();
    }
  };
};

// src/modules/knowledge/knowledge.routes.ts
import { Router } from "express";

// src/config/firebase.ts
import admin from "firebase-admin";
import "firebase-admin/auth";
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: env.GOOGLE_PROJECT_ID
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}
var firebaseAuth = admin.auth();

// src/config/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
var pool = new Pool({ connectionString: env.DATABASE_URL });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });
var db_default = prisma;

// src/modules/auth/middleware.ts
var authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const { uid, email, name } = decodedToken;
    if (!email) {
      return res.status(400).json({ message: "Email is required for authentication" });
    }
    let user = await db_default.user.findUnique({
      where: { id: uid }
    });
    if (user) {
      if (user.email !== email || name && user.name !== name) {
        user = await db_default.user.update({
          where: { id: uid },
          data: {
            email,
            name: name || user.name
          }
        });
      }
    } else {
      user = await db_default.user.findUnique({
        where: { email }
      });
      if (user) {
        if (name && user.name !== name) {
          user = await db_default.user.update({
            where: { id: user.id },
            data: { name }
          });
        }
      } else {
        user = await db_default.user.create({
          data: {
            id: uid,
            email,
            name: name || email.split("@")[0]
          }
        });
      }
    }
    req.user = {
      id: user.id,
      email: user.email
    };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};
var authorizeWorkspace = (requiredRole) => {
  return async (req, res, next) => {
    const { workspaceId } = req.params;
    const userId = req.user?.id;
    if (!userId || !workspaceId) {
      return res.status(400).json({ message: "Missing user or workspace context" });
    }
    const member = await db_default.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      }
    });
    if (!member) {
      return res.status(403).json({ message: "Access denied" });
    }
    const roles = ["VIEWER", "EDITOR", "OWNER"];
    const userRoleIndex = roles.indexOf(member.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    if (userRoleIndex < requiredRoleIndex) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

// src/events/queue.ts
import { Queue } from "bullmq";
var connection = {
  url: env.REDIS_URL
};
var ingestQueue = new Queue("ingest", { connection });
var summarizeQueue = new Queue("summarize", { connection });
var embedQueue = new Queue("embed", { connection });
var classifyQueue = new Queue("classify", { connection });
var enrichmentQueue = new Queue("enrichment", { connection });

// src/modules/knowledge/knowledge.service.ts
var createDocument = async (userId, data) => {
  const document = await db_default.document.create({
    data: {
      title: data.title,
      content: data.content,
      workspaceId: data.workspaceId,
      status: "PENDING"
    }
  });
  await ingestQueue.add("ingest-doc", { documentId: document.id });
  return document;
};
var getDocument = async (id) => {
  return db_default.document.findUnique({
    where: { id },
    include: { chunks: true }
  });
};
var listDocuments = async (workspaceId) => {
  return db_default.document.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
};

// src/modules/knowledge/knowledge.routes.ts
var router = Router();
router.post(
  "/:workspaceId/documents",
  authenticate,
  authorizeWorkspace("EDITOR"),
  async (req, res) => {
    const workspaceId = req.params.workspaceId;
    try {
      const doc = await createDocument(req.user.id, {
        ...req.body,
        workspaceId
      });
      res.status(201).json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  }
);
router.get(
  "/:workspaceId/documents",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    const workspaceId = req.params.workspaceId;
    try {
      const docs = await listDocuments(workspaceId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to list documents" });
    }
  }
);
router.get(
  "/:workspaceId/documents/:id",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    const id = req.params.id;
    try {
      const doc = await getDocument(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to get document" });
    }
  }
);
var knowledge_routes_default = router;

// src/modules/search/search.routes.ts
import { Router as Router2 } from "express";

// src/config/ai.ts
import { VertexAI } from "@google-cloud/vertexai";
var vertexAI = new VertexAI({
  project: env.GOOGLE_PROJECT_ID,
  location: env.GOOGLE_LOCATION
});
var generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-pro"
});
var embeddingModel = vertexAI.getGenerativeModel({
  model: "text-embedding-004"
});

// src/ai/embeddings.ts
var getEmbeddings = async (text) => {
  try {
    const result = await embeddingModel.generateContent({
      contents: [{ role: "user", parts: [{ text }] }]
    });
    const response = await embeddingModel.embedContent(text);
    return response.embedding.values;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
};

// src/ai/rerank.ts
var rerankResults = async (query, documents) => {
  if (documents.length === 0) return [];
  const prompt = `
You are a search ranking expert. Rank the following documents based on their relevance to the query.
Return the indices of the documents in order of relevance, comma separated (e.g. 0, 2, 1).

Query: ${query}

Documents:
${documents.map((doc, index) => `[${index}] ${doc.slice(0, 200)}...`).join("\n")}

Ranking:
`;
  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const indices = text.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    const rankedDocs = [];
    indices.forEach((i) => {
      if (documents[i]) rankedDocs.push(documents[i]);
    });
    documents.forEach((doc, i) => {
      if (!indices.includes(i)) rankedDocs.push(doc);
    });
    return rankedDocs;
  } catch (error) {
    console.error("Reranking failed, returning original order", error);
    return documents;
  }
};

// src/modules/search/search.service.ts
var searchKnowledge = async (workspaceId, query, limit = 10) => {
  const embedding = await getEmbeddings(query);
  const vectorString = `[${embedding.join(",")}]`;
  const results = await db_default.$queryRaw`
    SELECT 
      chunk.id, 
      chunk.content, 
      chunk."documentId", 
      1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
    FROM "DocumentChunk" AS chunk
    JOIN "Document" AS doc ON chunk."documentId" = doc.id
    WHERE doc."workspaceId" = ${workspaceId}
    ORDER BY similarity DESC
    LIMIT ${limit * 2} 
  `;
  const docsContent = results.map((r) => r.content);
  const rerankedContent = await rerankResults(query, docsContent);
  return results.sort((a, b) => {
    const indexA = rerankedContent.indexOf(a.content);
    const indexB = rerankedContent.indexOf(b.content);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  }).slice(0, limit);
};

// src/modules/search/search.routes.ts
var router2 = Router2();
router2.post(
  "/:workspaceId/search",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    try {
      const { query, limit } = req.body;
      if (!query) return res.status(400).json({ message: "Query is required" });
      const results = await searchKnowledge(req.params.workspaceId, query, limit);
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Search failed" });
    }
  }
);
var search_routes_default = router2;

// src/modules/spaces/spaces.routes.ts
import { Router as Router3 } from "express";

// src/ai/llm.ts
import crypto from "crypto";
var generateText = async (prompt, options = {}) => {
  const { workspaceId, action = "unknown", useCache = true } = options;
  const cacheKey = `ai:llm:${crypto.createHash("md5").update(prompt).digest("hex")}`;
  if (useCache) {
    const cached = await redis_default.get(cacheKey);
    if (cached) return cached;
  }
  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (useCache && text) {
      await redis_default.set(cacheKey, text, { EX: 86400 });
    }
    if (workspaceId) {
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);
      db_default.aIUsage.create({
        data: {
          workspaceId,
          action,
          model: "gemini-pro",
          tokens: inputTokens + outputTokens
        }
      }).catch((err) => console.error("Failed to track AI usage:", err));
    }
    return text;
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
};

// src/modules/spaces/spaces.service.ts
var suggestRelatedKnowledge = async (workspaceId, spaceId) => {
  const space = await db_default.space.findUnique({
    where: { id: spaceId },
    include: { elements: true }
  });
  if (!space) throw new Error("Space not found");
  const spaceContent = space.elements.map((el) => {
    const content = el.content;
    return content.text || "";
  }).join("\n").slice(0, 5e3);
  if (!spaceContent) return [];
  const embedding = await getEmbeddings(spaceContent);
  const vectorString = `[${embedding.join(",")}]`;
  const chunks = await db_default.$queryRaw`
    SELECT 
      doc.id as "documentId",
      doc.title,
      chunk.content,
      1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
    FROM "DocumentChunk" AS chunk
    JOIN "Document" AS doc ON chunk."documentId" = doc.id
    WHERE doc."workspaceId" = ${workspaceId}
    ORDER BY similarity DESC
    LIMIT 10
  `;
  const uniqueDocs = Array.from(new Set(chunks.map((c) => c.documentId))).map((id) => chunks.find((c) => c.documentId === id)).slice(0, 5);
  const suggestions = await Promise.all(uniqueDocs.map(async (doc) => {
    const prompt = `
      Context: Space content: "${spaceContent.slice(0, 500)}..."
      Candidate Document: "${doc.title}" - Content: "${doc.content.slice(0, 300)}..."
      
      Task: Explain briefly (1 sentence) why this document is relevant to the space.
    `;
    const explanation = await generateText(prompt, {
      workspaceId,
      action: "suggest-knowledge"
    });
    return {
      documentId: doc.documentId,
      title: doc.title,
      explanation,
      similarity: doc.similarity
    };
  }));
  return suggestions;
};
var compareSpaces = async (workspaceId, spaceId1, spaceId2) => {
  const [s1, s2] = await Promise.all([
    db_default.space.findUnique({ where: { id: spaceId1 }, include: { elements: true } }),
    db_default.space.findUnique({ where: { id: spaceId2 }, include: { elements: true } })
  ]);
  if (!s1 || !s2) throw new Error("Space not found");
  const c1 = s1.elements.map((e) => e.content.text || "").join("\n").slice(0, 3e3);
  const c2 = s2.elements.map((e) => e.content.text || "").join("\n").slice(0, 3e3);
  const prompt = `
    Compare these two knowledge spaces:
    Space A (${s1.name}): ${c1}
    Space B (${s2.name}): ${c2}

    Identify:
    1. Common themes
    2. Conflicting information (if any)
    3. How they relate to each other

    Format as JSON: { "themes": [], "conflicts": [], "relationship": "" }
  `;
  const response = await generateText(prompt, { workspaceId, action: "compare-spaces" });
  try {
    const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return { raw: response };
  }
};
var suggestEdges = async (workspaceId, spaceId) => {
  const space = await db_default.space.findUnique({
    where: { id: spaceId },
    include: { elements: true }
  });
  if (!space) throw new Error("Space not found");
  const elements = space.elements.map((e) => ({
    id: e.id,
    text: e.content.text || ""
  })).filter((e) => e.text.length > 10).slice(0, 10);
  if (elements.length < 2) return [];
  const prompt = `
    Analyze these nodes in a knowledge graph:
    ${elements.map((e) => `[${e.id}]: ${e.text.slice(0, 100)}`).join("\n")}

    Suggest relationships between them.
    Types: SUPPORTS, CONTRADICTS, RELATED
    
    Return JSON array: [{ "sourceId": "...", "targetId": "...", "type": "...", "reason": "..." }]
  `;
  const response = await generateText(prompt, { workspaceId, action: "suggest-edges" });
  try {
    const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return [];
  }
};
var detectGaps = async (workspaceId, spaceId) => {
  const space = await db_default.space.findUnique({
    where: { id: spaceId },
    include: { elements: true }
  });
  if (!space) throw new Error("Space not found");
  const content = space.elements.map((e) => e.content.text || "").join("\n").slice(0, 5e3);
  const prompt = `
    Analyze this knowledge space content:
    "${content}"

    Identify:
    1. Weakly covered concepts that seem important but are missing detail.
    2. Missing prerequisite knowledge that a reader would need.
    
    Return JSON: { "weakConcepts": [], "missingPrerequisites": [], "suggestions": [] }
  `;
  const response = await generateText(prompt, { workspaceId, action: "detect-gaps" });
  try {
    const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return { raw: response };
  }
};

// src/modules/spaces/spaces.routes.ts
var router3 = Router3();
router3.post(
  "/:workspaceId/spaces",
  authenticate,
  authorizeWorkspace("EDITOR"),
  async (req, res) => {
    try {
      const space = await db_default.space.create({
        data: {
          name: req.body.name,
          workspaceId: req.params.workspaceId
        }
      });
      res.status(201).json(space);
    } catch (error) {
      res.status(500).json({ error: "Failed to create space" });
    }
  }
);
router3.get(
  "/:workspaceId/spaces",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    try {
      const spaces = await db_default.space.findMany({
        where: { workspaceId: req.params.workspaceId }
      });
      res.json(spaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to list spaces" });
    }
  }
);
router3.get(
  "/:workspaceId/spaces/:spaceId/suggestions",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    try {
      const suggestions = await suggestRelatedKnowledge(
        req.params.workspaceId,
        req.params.spaceId
      );
      res.json(suggestions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  }
);
router3.post(
  "/:workspaceId/spaces/compare",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    const { spaceId1, spaceId2 } = req.body;
    try {
      const comparison = await compareSpaces(
        req.params.workspaceId,
        spaceId1,
        spaceId2
      );
      res.json(comparison);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to compare spaces" });
    }
  }
);
router3.get(
  "/:workspaceId/spaces/:spaceId/edges/suggest",
  authenticate,
  authorizeWorkspace("EDITOR"),
  async (req, res) => {
    try {
      const edges = await suggestEdges(
        req.params.workspaceId,
        req.params.spaceId
      );
      res.json(edges);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to suggest edges" });
    }
  }
);
router3.post(
  "/:workspaceId/edges",
  authenticate,
  authorizeWorkspace("EDITOR"),
  async (req, res) => {
    try {
      const edge = await db_default.edge.create({
        data: {
          ...req.body,
          workspaceId: req.params.workspaceId
        }
      });
      res.status(201).json(edge);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create edge" });
    }
  }
);
router3.get(
  "/:workspaceId/spaces/:spaceId/gaps",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    try {
      const gaps = await detectGaps(
        req.params.workspaceId,
        req.params.spaceId
      );
      res.json(gaps);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to detect gaps" });
    }
  }
);
var spaces_routes_default = router3;

// src/modules/chat/chat.routes.ts
import { Router as Router4 } from "express";

// src/modules/chat/chat.service.ts
var chatWithKnowledge = async (userId, data) => {
  const { message, workspaceId, documentId, history } = data;
  const embedding = await getEmbeddings(message);
  const vectorString = `[${embedding.join(",")}]`;
  let results = [];
  if (documentId) {
    results = await db_default.$queryRaw`
      SELECT 
        chunk.id, 
        chunk.content, 
        chunk."documentId", 
        1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
      FROM "DocumentChunk" AS chunk
      WHERE chunk."documentId" = ${documentId}
      ORDER BY similarity DESC
      LIMIT 5
    `;
  } else {
    results = await db_default.$queryRaw`
      SELECT 
        chunk.id, 
        chunk.content, 
        chunk."documentId", 
        1 - (chunk.embedding <=> ${vectorString}::vector) as similarity
      FROM "DocumentChunk" AS chunk
      JOIN "Document" AS doc ON chunk."documentId" = doc.id
      WHERE doc."workspaceId" = ${workspaceId}
      ORDER BY similarity DESC
      LIMIT 5
    `;
  }
  const context = results.map((r) => r.content).join("\n\n");
  const systemPrompt = `You are a helpful AI assistant for the Zapnote workspace.
Use the following context to answer the user's question.
If the answer is not in the context, say you don't know, but try to be helpful.
Keep the answer concise and relevant.

Context:
${context}
`;
  let fullPrompt = `${systemPrompt}

User: ${message}
Assistant:`;
  if (history && history.length > 0) {
    const historyText = history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
    fullPrompt = `${systemPrompt}

${historyText}
User: ${message}
Assistant:`;
  }
  const responseText = await generateText(fullPrompt);
  return {
    response: responseText,
    sources: results.map((r) => ({
      id: r.id,
      content: r.content,
      documentId: r.documentId,
      similarity: r.similarity
    }))
  };
};

// src/modules/chat/chat.routes.ts
var router4 = Router4();
router4.post(
  "/:workspaceId",
  authenticate,
  authorizeWorkspace("VIEWER"),
  async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const { message, documentId, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }
    try {
      const result = await chatWithKnowledge(req.user.id, {
        message,
        workspaceId,
        documentId,
        history
      });
      res.json(result);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  }
);
var chat_routes_default = router4;

// src/app.ts
var app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimiter(100, 60));
app.use("/api/knowledge", knowledge_routes_default);
app.use("/api/search", search_routes_default);
app.use("/api/spaces", spaces_routes_default);
app.use("/api/chat", chat_routes_default);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use((err, req, res, next) => {
  console.error("[Global Error]", err);
  res.status(err.status || 500).json({
    status: "error",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error"
  });
});
var app_default = app;

// src/modules/spaces/spaces.socket.ts
import "socket.io";
var setupSpacesSocket = (io2) => {
  const spacesNamespace = io2.of("/spaces");
  spacesNamespace.on("connection", (socket) => {
    logger.info(`User connected to spaces: ${socket.id}`);
    socket.on("join-space", async (spaceId) => {
      socket.join(spaceId);
      logger.info(`User ${socket.id} joined space ${spaceId}`);
    });
    socket.on("update-element", async (data) => {
      const { spaceId, element } = data;
      try {
        await db_default.spaceElement.upsert({
          where: { id: element.id },
          update: { content: element.content, type: element.type },
          create: {
            id: element.id,
            spaceId,
            type: element.type,
            content: element.content
          }
        });
        socket.to(spaceId).emit("element-updated", element);
      } catch (error) {
        logger.error("Failed to update element", error);
      }
    });
    socket.on("explain-space", (spaceId) => {
      (async () => {
        try {
          const elements = await db_default.spaceElement.findMany({ where: { spaceId } });
          const context = JSON.stringify(elements.map((e) => e.content));
          const prompt = `Explain this whiteboard: ${context}`;
          const explanation = await generateText(prompt);
          socket.emit("space-explanation", { explanation });
        } catch (error) {
          logger.error("Failed to explain space", error);
          socket.emit("error", { message: "AI generation failed" });
        }
      })();
    });
    socket.on("disconnect", () => {
      logger.info(`User disconnected from spaces: ${socket.id}`);
    });
  });
};

// src/server.ts
var server = http.createServer(app_default);
var io = new Server2(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
setupSpacesSocket(io);
server.listen(env.PORT, () => {
  logger.info(`Zapnote Backend running on port ${env.PORT}`);
});
