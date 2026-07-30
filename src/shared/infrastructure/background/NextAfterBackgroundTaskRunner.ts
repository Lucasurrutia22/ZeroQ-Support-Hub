import { after } from "next/server";
import type { BackgroundTaskRunner } from "@/shared/domain/ports/background-task";

// Implementa BackgroundTaskRunner con el `after()` de Next.js (Server
// Actions/Route Handlers/Server Components, runtime Node) — a diferencia de
// una promesa suelta, Next.js mantiene la request "viva" internamente hasta
// que el trabajo pasado a `after()` también termina, en vez de poder
// cortarlo apenas se envía la respuesta (ver comentario en el port para el
// caso real que expuso esto).
export class NextAfterBackgroundTaskRunner implements BackgroundTaskRunner {
  run(task: () => Promise<void>): void {
    try {
      // after() lanza sincrónicamente si no hay un request activo (scripts,
      // seeds, tests) — el contrato de este port es "nunca romper al
      // caller", así que ese caso se degrada a logear y seguir, igual que un
      // fallo del propio `task`.
      after(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[background-task] No se pudo programar el trabajo en segundo plano: ${message}`);
    }
  }
}
