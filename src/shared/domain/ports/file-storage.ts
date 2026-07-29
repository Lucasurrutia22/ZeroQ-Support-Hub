// Port genérico de almacenamiento de archivos — usado por Knowledge
// (Documentación) y Cases (Evidencias/Logs de adjuntos). Un solo port
// compartido en vez de uno por módulo: ambos necesitan exactamente "subir
// un archivo" y "obtener una URL de descarga temporal", y duplicarlo por
// módulo no agrega ningún aislamiento real (Ports & Adapters, ARCHITECTURE.md §8).
export interface FileStorage {
  upload(params: {
    key: string;
    file: Buffer;
    contentType: string;
  }): Promise<void>;
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
