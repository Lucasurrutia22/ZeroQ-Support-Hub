// Result/Either — ver ARCHITECTURE.md §8: los use cases devuelven esto en
// vez de lanzar excepciones para errores de negocio (permiso denegado,
// estado inválido, etc.). Excepciones quedan para fallos de infraestructura.
export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
