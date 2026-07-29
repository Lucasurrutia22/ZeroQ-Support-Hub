import { err, ok, type Result, DomainError } from "@/shared/domain/result";
import type { ActingUser } from "@/modules/identity/domain/role";
import { clientRepository } from "../../infrastructure/container";
import type { Client, ClientType } from "../../domain/types";
import { canManageClients } from "../policies";

export interface CreateClientCommand {
  name: string;
  type: ClientType;
  contactInfo?: Record<string, unknown>;
}

export async function createClient(
  actingUser: ActingUser,
  command: CreateClientCommand,
): Promise<Result<Client>> {
  if (!canManageClients(actingUser.role)) {
    return err(
      new DomainError(
        "forbidden",
        "Solo un administrador puede crear clientes.",
      ),
    );
  }

  const client = await clientRepository.create({
    name: command.name,
    type: command.type,
    contactInfo: command.contactInfo ?? null,
  });

  return ok(client);
}

export async function listClients(filter: {
  type?: ClientType;
}): Promise<Client[]> {
  return clientRepository.list(filter);
}

export async function getClientById(id: string): Promise<Client | null> {
  return clientRepository.findById(id);
}
