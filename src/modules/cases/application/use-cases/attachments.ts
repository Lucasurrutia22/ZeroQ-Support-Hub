import { randomUUID } from "node:crypto";
import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import {
  attachmentRepository,
  attachmentStorage,
  resolvedCaseRepository,
} from "../../infrastructure/container";
import type { Attachment, AttachmentFileType } from "../../domain/types";
import { canUploadAttachment } from "../policies";

export interface UploadCaseAttachmentCommand {
  caseId: string;
  fileType: AttachmentFileType;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}

export async function uploadCaseAttachment(
  actingUser: ActingUser,
  command: UploadCaseAttachmentCommand,
): Promise<Result<Attachment>> {
  if (!canUploadAttachment(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no tiene permiso para subir evidencias/logs.",
      ),
    );
  }

  const resolvedCase = await resolvedCaseRepository.findById(command.caseId);
  if (!resolvedCase) {
    return err(new DomainError("case_not_found", "El caso no existe."));
  }

  const storageKey = `${command.caseId}/${randomUUID()}-${command.fileName}`;

  await attachmentStorage.upload({
    key: storageKey,
    file: command.fileBuffer,
    contentType: command.contentType,
  });

  const attachment = await attachmentRepository.create({
    caseId: command.caseId,
    fileType: command.fileType,
    storageKey,
    uploadedBy: actingUser.id,
  });

  return ok(attachment);
}

export async function listCaseAttachments(
  caseId: string,
): Promise<Attachment[]> {
  return attachmentRepository.listByCase(caseId);
}

export async function getAttachmentDownloadUrl(
  attachmentId: string,
): Promise<Result<string>> {
  const attachment = await attachmentRepository.findById(attachmentId);
  if (!attachment) {
    return err(new DomainError("not_found", "El adjunto no existe."));
  }

  const url = await attachmentStorage.getDownloadUrl(attachment.storageKey);
  return ok(url);
}
