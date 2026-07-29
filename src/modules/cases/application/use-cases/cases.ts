import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { categoryRepository } from "@/modules/knowledge/infrastructure/container";
import { clientRepository, infrastructureAssetRepository } from "@/modules/clients/infrastructure/container";
import { contentIndexer, resolvedCaseRepository } from "../../infrastructure/container";
import type { ResolvedCaseListFilter } from "../../domain/ports";
import type { ResolvedCaseWithDetails } from "../../domain/types";
import { canCreateCase, canEditCase } from "../policies";

export interface CreateResolvedCaseCommand {
  title: string;
  description: string;
  clientId?: string;
  infrastructureAssetId?: string;
  categoryId: string;
  symptoms: string;
  rootCause: string;
  solution: string;
  timeSpentMinutes?: number;
  relatedProcedureIds?: string[];
}

export async function createResolvedCase(
  actingUser: ActingUser,
  command: CreateResolvedCaseCommand,
): Promise<Result<ResolvedCaseWithDetails>> {
  if (!canCreateCase(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Tu rol no tiene permiso para documentar casos resueltos.",
      ),
    );
  }

  const category = await categoryRepository.findById(command.categoryId);
  if (!category) {
    return err(new DomainError("category_not_found", "La categoría no existe."));
  }

  if (command.clientId) {
    const client = await clientRepository.findById(command.clientId);
    if (!client) {
      return err(new DomainError("client_not_found", "El cliente no existe."));
    }
  }

  if (command.infrastructureAssetId) {
    const asset = await infrastructureAssetRepository.findById(
      command.infrastructureAssetId,
    );
    if (!asset) {
      return err(new DomainError("asset_not_found", "El activo no existe."));
    }
  }

  const resolvedCase = await resolvedCaseRepository.create({
    title: command.title,
    description: command.description,
    clientId: command.clientId ?? null,
    infrastructureAssetId: command.infrastructureAssetId ?? null,
    categoryId: command.categoryId,
    engineerId: actingUser.id,
    symptoms: command.symptoms,
    rootCause: command.rootCause,
    solution: command.solution,
    timeSpentMinutes: command.timeSpentMinutes ?? null,
    relatedProcedureIds: command.relatedProcedureIds ?? [],
  });

  // Sin flujo de revisión (a diferencia de Procedure) — se indexa apenas se
  // crea (AI_RAG_DESIGN.md §1). Fire-and-forget, ver ContentIndexerAdapter.
  contentIndexer.indexAsync("resolved_case", resolvedCase.id);

  return ok(resolvedCase);
}

export async function linkProcedureToCase(
  actingUser: ActingUser,
  caseId: string,
  procedureId: string,
): Promise<Result<void>> {
  if (!canEditCase(actingUser.role)) {
    return err(
      new DomainError("forbidden", "Tu rol no puede editar este caso."),
    );
  }

  const resolvedCase = await resolvedCaseRepository.findById(caseId);
  if (!resolvedCase) {
    return err(new DomainError("not_found", "El caso no existe."));
  }

  await resolvedCaseRepository.linkProcedure(caseId, procedureId);
  return ok(undefined);
}

export async function listResolvedCases(
  filter: ResolvedCaseListFilter,
): Promise<ResolvedCaseWithDetails[]> {
  return resolvedCaseRepository.list(filter);
}

export async function getResolvedCaseById(
  id: string,
): Promise<ResolvedCaseWithDetails | null> {
  return resolvedCaseRepository.findById(id);
}
