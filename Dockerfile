# Use official Node.js LTS image
FROM node:20-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema for migrations
COPY prisma ./prisma
COPY package*.json ./

# Create a non-root user
RUN useradd -m -u 1001 nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Run migrations and start the app
CMD npx prisma migrate deploy && node dist/server.js
