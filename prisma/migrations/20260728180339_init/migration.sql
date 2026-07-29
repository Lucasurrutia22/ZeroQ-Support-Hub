-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'supervisor', 'engineer_l1', 'engineer_l2', 'readonly');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('draft', 'in_review', 'approved', 'deprecated');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('manual', 'datasheet', 'firmware_notes', 'otro');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('banco', 'hospital', 'municipalidad', 'retail', 'gobierno', 'otro');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('totem', 'modulo_atencion', 'pantalla', 'impresora', 'servidor', 'tv_box', 'otro');

-- CreateEnum
CREATE TYPE "AttachmentFileType" AS ENUM ('image', 'video', 'pdf', 'config', 'log');

-- CreateEnum
CREATE TYPE "DocumentChunkSourceType" AS ENUM ('procedure_version', 'resolved_case');

-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "ProcedureStatus" NOT NULL DEFAULT 'draft',
    "riskLevel" "RiskLevel" NOT NULL,
    "estimatedTimeMinutes" INTEGER,
    "currentVersionId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureVersion" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "changeSummary" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureTag" (
    "procedureId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProcedureTag_pkey" PRIMARY KEY ("procedureId","tagId")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","procedureId")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "contactInfo" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfrastructureAsset" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "model" TEXT,
    "location" TEXT,
    "serialNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfrastructureAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolvedCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clientId" TEXT,
    "infrastructureAssetId" TEXT,
    "categoryId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "timeSpentMinutes" INTEGER,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolvedCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseProcedure" (
    "caseId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,

    CONSTRAINT "CaseProcedure_pkey" PRIMARY KEY ("caseId","procedureId")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT,
    "caseId" TEXT,
    "fileType" "AttachmentFileType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "sourceType" "DocumentChunkSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" halfvec(1024),
    "chunkIndex" INTEGER NOT NULL,
    "categoryId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sourceReferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_slug_key" ON "Procedure"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_currentVersionId_key" ON "Procedure"("currentVersionId");

-- CreateIndex
CREATE INDEX "Procedure_categoryId_idx" ON "Procedure"("categoryId");

-- CreateIndex
CREATE INDEX "Procedure_status_idx" ON "Procedure"("status");

-- CreateIndex
CREATE INDEX "Procedure_authorId_idx" ON "Procedure"("authorId");

-- CreateIndex
CREATE INDEX "ProcedureVersion_procedureId_idx" ON "ProcedureVersion"("procedureId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureVersion_procedureId_versionNumber_key" ON "ProcedureVersion"("procedureId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ProcedureTag_tagId_idx" ON "ProcedureTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_supersedesId_key" ON "Document"("supersedesId");

-- CreateIndex
CREATE INDEX "Document_categoryId_idx" ON "Document"("categoryId");

-- CreateIndex
CREATE INDEX "Favorite_procedureId_idx" ON "Favorite"("procedureId");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_active_idx" ON "Client"("active");

-- CreateIndex
CREATE INDEX "InfrastructureAsset_clientId_idx" ON "InfrastructureAsset"("clientId");

-- CreateIndex
CREATE INDEX "InfrastructureAsset_type_idx" ON "InfrastructureAsset"("type");

-- CreateIndex
CREATE INDEX "ResolvedCase_clientId_idx" ON "ResolvedCase"("clientId");

-- CreateIndex
CREATE INDEX "ResolvedCase_infrastructureAssetId_idx" ON "ResolvedCase"("infrastructureAssetId");

-- CreateIndex
CREATE INDEX "ResolvedCase_categoryId_idx" ON "ResolvedCase"("categoryId");

-- CreateIndex
CREATE INDEX "ResolvedCase_engineerId_idx" ON "ResolvedCase"("engineerId");

-- CreateIndex
CREATE INDEX "ResolvedCase_resolvedAt_idx" ON "ResolvedCase"("resolvedAt");

-- CreateIndex
CREATE INDEX "CaseProcedure_procedureId_idx" ON "CaseProcedure"("procedureId");

-- CreateIndex
CREATE INDEX "Attachment_procedureId_idx" ON "Attachment"("procedureId");

-- CreateIndex
CREATE INDEX "Attachment_caseId_idx" ON "Attachment"("caseId");

-- CreateIndex
CREATE INDEX "DocumentChunk_sourceType_sourceId_idx" ON "DocumentChunk"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "DocumentChunk_categoryId_idx" ON "DocumentChunk"("categoryId");

-- CreateIndex
CREATE INDEX "DocumentChunk_clientId_idx" ON "DocumentChunk"("clientId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProcedureVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureTag" ADD CONSTRAINT "ProcedureTag_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureTag" ADD CONSTRAINT "ProcedureTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfrastructureAsset" ADD CONSTRAINT "InfrastructureAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedCase" ADD CONSTRAINT "ResolvedCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedCase" ADD CONSTRAINT "ResolvedCase_infrastructureAssetId_fkey" FOREIGN KEY ("infrastructureAssetId") REFERENCES "InfrastructureAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedCase" ADD CONSTRAINT "ResolvedCase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolvedCase" ADD CONSTRAINT "ResolvedCase_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseProcedure" ADD CONSTRAINT "CaseProcedure_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ResolvedCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseProcedure" ADD CONSTRAINT "CaseProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ResolvedCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
