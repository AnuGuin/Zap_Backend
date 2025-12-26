/*
  Warnings:

  - You are about to drop the column `documentId` on the `DocumentChunk` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SpaceElement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SpaceElement` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `knowledgeItemId` to the `DocumentChunk` table without a default value. This is not possible if the table is not empty.
  - Made the column `type` on table `Entity` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('PDF', 'URL', 'TEXT', 'YOUTUBE', 'IMAGE');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentChunk" DROP CONSTRAINT "DocumentChunk_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Edge" DROP CONSTRAINT "Edge_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "EntityOnDocument" DROP CONSTRAINT "EntityOnDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_workspaceId_fkey";

-- AlterTable
ALTER TABLE "DocumentChunk" DROP COLUMN "documentId",
ADD COLUMN     "knowledgeItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "createdAt",
ALTER COLUMN "type" SET NOT NULL;

-- AlterTable
ALTER TABLE "EntityOnDocument" ALTER COLUMN "confidence" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Space" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SpaceElement" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkspaceMember" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "sourceUrl" TEXT,
    "type" "KnowledgeType" NOT NULL DEFAULT 'TEXT',
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ItemTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ItemTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "_ItemTags_B_index" ON "_ItemTags"("B");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_knowledgeItemId_fkey" FOREIGN KEY ("knowledgeItemId") REFERENCES "KnowledgeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityOnDocument" ADD CONSTRAINT "EntityOnDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemTags" ADD CONSTRAINT "_ItemTags_A_fkey" FOREIGN KEY ("A") REFERENCES "KnowledgeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemTags" ADD CONSTRAINT "_ItemTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
