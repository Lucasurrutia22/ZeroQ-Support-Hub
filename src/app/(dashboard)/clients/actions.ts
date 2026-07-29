"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { createClientSchema, registerAssetSchema } from "@/lib/schemas/support";
import { createClient } from "@/modules/clients/application/use-cases/clients";
import { registerAsset } from "@/modules/clients/application/use-cases/assets";

export async function createClientAction(formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof createClientSchema.parse>;
  try {
    input = createClientSchema.parse({
      name: formData.get("name"),
      type: formData.get("type"),
    });
  } catch (error) {
    if (error instanceof ZodError) redirect("/clients/new?error=invalid_input");
    throw error;
  }

  const result = await createClient(actingUser, input);
  if (!result.ok) {
    redirect(`/clients/new?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath("/clients");
  redirect(`/clients/${result.value.id}`);
}

export async function registerAssetAction(clientId: string, formData: FormData) {
  const actingUser = await getActingUserOrThrow();

  let input: ReturnType<typeof registerAssetSchema.parse>;
  try {
    input = registerAssetSchema.parse({
      clientId,
      type: formData.get("type"),
      model: formData.get("model") || undefined,
      location: formData.get("location") || undefined,
      serialNumber: formData.get("serialNumber") || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/clients/${clientId}/assets?error=invalid_input`);
    }
    throw error;
  }

  const result = await registerAsset(actingUser, input);
  if (!result.ok) {
    redirect(`/clients/${clientId}/assets?error=${encodeURIComponent(result.error.code)}`);
  }

  revalidatePath(`/clients/${clientId}/assets`);
  redirect(`/clients/${clientId}/assets`);
}
