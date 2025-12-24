import { Router, type Response } from 'express';
import { authenticate, authorizeWorkspace } from '../auth/middleware';
import type { AuthRequest } from '../auth/middleware';
import * as KnowledgeService from './knowledge.service';

const router = Router();

router.post(
  '/:workspaceId/documents',
  authenticate,
  authorizeWorkspace('EDITOR'),
  async (req: AuthRequest, res: Response) => {
    const workspaceId = req.params.workspaceId!;
    try {
      const doc = await KnowledgeService.createDocument(req.user!.id, {
        ...req.body,
        workspaceId,
      });
      res.status(201).json(doc);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create document' });
    }
  }
);

router.get(
  '/:workspaceId/documents',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const workspaceId = req.params.workspaceId!;
    try {
      const docs = await KnowledgeService.listDocuments(workspaceId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list documents' });
    }
  }
);

router.get(
  '/:workspaceId/documents/:id',
  authenticate,
  authorizeWorkspace('VIEWER'),
  async (req: AuthRequest, res: Response) => {
    const id = req.params.id!;
    try {
      const doc = await KnowledgeService.getDocument(id);
      if (!doc) return res.status(404).json({ message: 'Document not found' });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get document' });
    }
  }
);

export default router;
