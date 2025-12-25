/*
  Warnings:

  - You are about to drop the column `creatorId` on the `Space` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Space` table. All the data in the column will be lost.
  - The primary key for the `WorkspaceMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `role` column on the `WorkspaceMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AIJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Annotation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityOnKnowledge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KnowledgeItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpaceNode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VectorChunk` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,workspaceId]` on the table `WorkspaceMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Workspace` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `WorkspaceMember` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_knowledgeItemId_fkey";

-- DropForeignKey
ALTER TABLE "EntityOnKnowledge" DROP CONSTRAINT "EntityOnKnowledge_entityId_fkey";

-- DropForeignKey
ALTER TABLE "EntityOnKnowledge" DROP CONSTRAINT "EntityOnKnowledge_knowledgeItemId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeItem" DROP CONSTRAINT "KnowledgeItem_createdById_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeItem" DROP CONSTRAINT "KnowledgeItem_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "SpaceNode" DROP CONSTRAINT "SpaceNode_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "VectorChunk" DROP CONSTRAINT "VectorChunk_knowledgeItemId_fkey";

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "creatorId";
ALTER TABLE "Space" RENAME COLUMN "title" TO "name";
ALTER TABLE "Space" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_pkey";
ALTER TABLE "WorkspaceMember" ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "WorkspaceMember" DROP COLUMN "role";
ALTER TABLE "WorkspaceMember" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'VIEWER';
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "AIJob";

-- DropTable
DROP TABLE "Annotation";

-- DropTable
DROP TABLE "EntityOnKnowledge";

-- DropTable
DROP TABLE "KnowledgeItem";

-- DropTable
DROP TABLE "SpaceNode";

-- DropTable
DROP TABLE "VectorChunk";

-- DropEnum
DROP TYPE "KnowledgeType";

-- DropEnum
DROP TYPE "SpaceNodeType";

-- DropEnum
DROP TYPE "WorkspaceRole";

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityOnDocument" (
    "documentId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EntityOnDocument_pkey" PRIMARY KEY ("documentId","entityId")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector,
    "documentId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceElement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "spaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityOnDocument" ADD CONSTRAINT "EntityOnDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityOnDocument" ADD CONSTRAINT "EntityOnDocument_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceElement" ADD CONSTRAINT "SpaceElement_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
