// Port compartido: ejecuta trabajo asíncrono que debe sobrevivir más allá
// de la respuesta HTTP que lo originó — un fire-and-forget que de verdad
// termina, no una promesa suelta (`void promise.then(...)`).
//
// Hallazgo en vivo (ingesta de Bitácora desde Documentación): Next.js puede
// cortar trabajo asíncrono desprendido apenas termina de enviar la
// respuesta de una Server Action — confirmado con un caso real: la llamada
// al LLM para resumir un documento tarda 2-3 min, pero la Server Action de
// upload ya había redirigido en ~9s, y la promesa de ingesta nunca llegaba
// a completarse ni a loguear error (simplemente se cortaba a mitad). Una
// promesa suelta "sobrevive" solo mientras el runtime decida mantenerla —
// no es garantía, y en este caso no la mantuvo.
export interface BackgroundTaskRunner {
  run(task: () => Promise<void>): void;
}
