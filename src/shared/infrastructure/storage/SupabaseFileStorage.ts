import { getSupabaseAdmin } from "@/shared/infrastructure/supabase/admin-client";
import type { FileStorage } from "@/shared/domain/ports/file-storage";

// Adapter — Supabase Storage detrás del port FileStorage. Un bucket privado
// por dominio de contenido (nunca URL pública permanente — zeroq-security):
// "documents" para Documentación, "case-attachments" para Evidencias/Logs.
export class SupabaseFileStorage implements FileStorage {
  constructor(private readonly bucket: string) {}

  async upload(params: {
    key: string;
    file: Buffer;
    contentType: string;
  }): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .storage.from(this.bucket)
      .upload(params.key, params.file, {
        contentType: params.contentType,
        upsert: false,
      });

    if (error) throw error;
  }

  async getDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }
}
