import { randomUUID } from "node:crypto";
import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import {
  categoryRepository,
  documentRepository,
  documentStorage,
} from "../../infrastructure/container";
import type { DocumentListFilter } from "../../domain/ports";
import type { Document, DocumentFileType } from "../../domain/types";
import { canUploadDocument } from "../policies";

export interface UploadDocumentCommand {
  title: string;
  categoryId: string;
  fileType: DocumentFileType;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  /** Si se sube como reemplazo de un documento existente. */
  supersedesId?: string;
}

export async function uploadDocument(
  actingUser: ActingUser,
  command: UploadDocumentCommand,
): Promise<Result<Document>> {
  if (!canUploadDocument(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no tiene permiso para subir documentación.",
      ),
    );
  }

  const category = await categoryRepository.findById(command.categoryId);
  if (!category) {
    return err(new DomainError("category_not_found", "La categoría no existe."));
  }

  if (command.supersedesId) {
    const previous = await documentRepository.findById(command.supersedesId);
    if (!previous) {
      return err(
        new DomainError(
          "document_not_found",
          "El documento que intentas reemplazar no existe.",
        ),
      );
    }
  }

  const storageKey = `${command.categoryId}/${randomUUID()}-${command.fileName}`;

  await documentStorage.upload({
    key: storageKey,
    file: command.fileBuffer,
    contentType: command.contentType,
  });

  const document = await documentRepository.create({
    title: command.title,
    categoryId: command.categoryId,
    fileType: command.fileType,
    storageKey,
    uploadedBy: actingUser.id,
    supersedesId: command.supersedesId ?? null,
  });

  return ok(document);
}

export async function listDocuments(
  filter: DocumentListFilter,
): Promise<Document[]> {
  return documentRepository.list(filter);
}

export async function getDocumentDownloadUrl(
  documentId: string,
): Promise<Result<string>> {
  const document = await documentRepository.findById(documentId);
  if (!document) {
    return err(new DomainError("not_found", "El documento no existe."));
  }

  const url = await documentStorage.getDownloadUrl(document.storageKey);
  return ok(url);
}
