import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { slugify } from "@/lib/slugify";
import {
  answerCacheStore,
  categoryRepository,
  contentIndexer,
  procedureRepository,
  tagRepository,
} from "../../infrastructure/container";
import type { ProcedureListFilter, ProcedurePage } from "../../domain/ports";
import type { ProcedureVersion, ProcedureWithDetails } from "../../domain/types";
import {
  canApproveProcedure,
  canCreateProcedure,
  canDeprecateProcedure,
  canEditProcedure,
  canRequestReview,
} from "../policies";

export interface CreateProcedureCommand {
  title: string;
  categoryId: string;
  riskLevel: "low" | "medium" | "high";
  estimatedTimeMinutes?: number;
  contentMarkdown: string;
  tagNames: string[];
}

async function uniqueSlugFor(title: string): Promise<string> {
  const base = slugify(title) || "procedimiento";
  let candidate = base;
  let suffix = 1;
  while (await procedureRepository.slugExists(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function createProcedure(
  actingUser: ActingUser,
  command: CreateProcedureCommand,
): Promise<Result<ProcedureWithDetails>> {
  if (!canCreateProcedure(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no tiene permiso para crear procedimientos.",
      ),
    );
  }

  const category = await categoryRepository.findById(command.categoryId);
  if (!category) {
    return err(new DomainError("category_not_found", "La categoría no existe."));
  }

  const tags = await tagRepository.findOrCreateByNames(command.tagNames);
  const slug = await uniqueSlugFor(command.title);

  const procedure = await procedureRepository.create({
    title: command.title,
    slug,
    categoryId: command.categoryId,
    riskLevel: command.riskLevel,
    estimatedTimeMinutes: command.estimatedTimeMinutes ?? null,
    authorId: actingUser.id,
    contentMarkdown: command.contentMarkdown,
    tagIds: tags.map((tag) => tag.id),
  });

  return ok(procedure);
}

export interface EditProcedureContentCommand {
  procedureId: string;
  contentMarkdown: string;
  changeSummary?: string;
  tagNames?: string[];
}

export async function editProcedureContent(
  actingUser: ActingUser,
  command: EditProcedureContentCommand,
): Promise<Result<ProcedureVersion>> {
  if (!canEditProcedure(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no tiene permiso para editar procedimientos.",
      ),
    );
  }

  const procedure = await procedureRepository.findById(command.procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }

  if (command.tagNames) {
    const tags = await tagRepository.findOrCreateByNames(command.tagNames);
    await procedureRepository.setTags(
      procedure.id,
      tags.map((tag) => tag.id),
    );
  }

  const version = await procedureRepository.addVersion({
    procedureId: procedure.id,
    contentMarkdown: command.contentMarkdown,
    changeSummary: command.changeSummary ?? null,
    authorId: actingUser.id,
  });

  // El contenido citado por una respuesta cacheada cambió — esa respuesta ya
  // no es confiable (memoria semántica del chat, ver AnswerCacheStore).
  await answerCacheStore.invalidateByProcedureId(procedure.id);

  return ok(version);
}

export async function requestReview(
  actingUser: ActingUser,
  procedureId: string,
): Promise<Result<void>> {
  if (!canRequestReview(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede solicitar revisión."),
    );
  }

  const procedure = await procedureRepository.findById(procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }
  if (procedure.status !== "draft") {
    return err(
      new DomainError(
        "invalid_status",
        "Solo un procedimiento en borrador puede pasar a revisión.",
      ),
    );
  }

  await procedureRepository.updateStatus(procedureId, "in_review");
  return ok(undefined);
}

export async function approveProcedure(
  actingUser: ActingUser,
  procedureId: string,
): Promise<Result<void>> {
  if (!canApproveProcedure(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede aprobar procedimientos."),
    );
  }

  const procedure = await procedureRepository.findById(procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }
  if (procedure.status !== "in_review") {
    return err(
      new DomainError(
        "invalid_status",
        "Solo un procedimiento en revisión puede aprobarse.",
      ),
    );
  }

  await procedureRepository.updateStatus(procedureId, "approved");

  // Dispara indexación RAG (AI_RAG_DESIGN.md §1: solo contenido aprobado se
  // indexa). Fire-and-forget — no bloquea esta aprobación (ver
  // ContentIndexerAdapter para la simplificación vs. BullMQ/D7).
  if (procedure.currentVersionId) {
    contentIndexer.indexAsync("procedure_version", procedure.currentVersionId);
  }

  return ok(undefined);
}

export async function rejectProcedure(
  actingUser: ActingUser,
  procedureId: string,
): Promise<Result<void>> {
  if (!canApproveProcedure(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede rechazar procedimientos."),
    );
  }

  const procedure = await procedureRepository.findById(procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }
  if (procedure.status !== "in_review") {
    return err(
      new DomainError(
        "invalid_status",
        "Solo un procedimiento en revisión puede rechazarse.",
      ),
    );
  }

  // Vuelve a borrador — sin ReviewRequest todavía no hay dónde guardar la
  // nota de rechazo (ver prisma/schema.prisma, decisión de alcance).
  await procedureRepository.updateStatus(procedureId, "draft");
  return ok(undefined);
}

export async function deprecateProcedure(
  actingUser: ActingUser,
  procedureId: string,
): Promise<Result<void>> {
  if (!canDeprecateProcedure(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede deprecar procedimientos."),
    );
  }

  const procedure = await procedureRepository.findById(procedureId);
  if (!procedure) {
    return err(new DomainError("not_found", "El procedimiento no existe."));
  }
  if (procedure.status !== "approved") {
    return err(
      new DomainError(
        "invalid_status",
        "Solo un procedimiento aprobado puede depreciarse.",
      ),
    );
  }

  await procedureRepository.updateStatus(procedureId, "deprecated");
  // Ídem editProcedureContent: un procedimiento depreciado no debería seguir
  // recomendándose desde una respuesta cacheada.
  await answerCacheStore.invalidateByProcedureId(procedureId);
  return ok(undefined);
}

export async function listProcedures(
  filter: ProcedureListFilter,
): Promise<ProcedureWithDetails[]> {
  return procedureRepository.list(filter);
}

const DEFAULT_PAGE_SIZE = 20;

export async function listProceduresPaged(
  filter: ProcedureListFilter,
  page = 1,
): Promise<ProcedurePage> {
  return procedureRepository.listPaged(filter, { page, pageSize: DEFAULT_PAGE_SIZE });
}

export async function getProcedureBySlug(
  slug: string,
): Promise<ProcedureWithDetails | null> {
  return procedureRepository.findBySlug(slug);
}

export async function listProcedureVersions(
  procedureId: string,
): Promise<ProcedureVersion[]> {
  return procedureRepository.listVersions(procedureId);
}
