// Anotador de comandos de un Procedure (pedido del usuario: "necesito que sea
// más claro en dónde ejecutar cada comando, basate como si fueras un agente
// experto en Linux"). Deterministico, basado en reglas — NO pasa por el LLM:
// esta misma sesión ya demostró que el modelo local (Ollama llama3.2) es
// poco confiable para tareas de clasificación/explicación de este tipo (ver
// AI_RAG_DESIGN.md §13, puntos 6-7). Un parser de reglas es rápido, gratis,
// 100% determinístico, y corre en cada render — no hace falta una corrida
// batch ni volver a tocar los 109 procedimientos ya importados.
//
// La Bitácora real tiene formato muy inconsistente (guiones "-cmd", pasos
// numerados "1.- cmd", líneas con tab de comentario) — se normaliza acá en
// vez de asumir Markdown limpio.

export interface CommandAnnotation {
  command: string;
  context: string;
  explanation: string;
}

// Prefijos (primera palabra o patrón) que identifican una línea como comando
// real ejecutable, no prosa. Alcance: lo que aparece de verdad en la
// Bitácora de Tótems (Docker, Postgres, Redis, red, Linux, PowerShell).
const COMMAND_KEYWORDS = [
  "docker-compose",
  "docker",
  "cd",
  "sudo",
  "systemctl",
  "service",
  "redis-cli",
  "psql",
  "mysql",
  "curl",
  "wget",
  "ssh",
  "scp",
  "pscp",
  "chmod",
  "chown",
  "nano",
  "vim",
  "vi",
  "cat",
  "grep",
  "tail",
  "head",
  "ls",
  "rm",
  "cp",
  "mv",
  "mkdir",
  "tar",
  "crontab",
  "date",
  "hwclock",
  "udevadm",
  "apt-get",
  "apt",
  "dpkg",
  "yum",
  "git",
  "npm",
  "node",
  "kill",
  "killall",
  "ps",
  "top",
  "df",
  "du",
  "journalctl",
  "ping",
  "nc",
  "netstat",
  "iptables",
  "ufw",
  "reboot",
  "shutdown",
  "zq",
  "xrandr",
  "xinput",
  "./run.sh",
  "./update.sh",
  // Windows / PowerShell
  "get-",
  "set-",
  "restart-",
  "stop-",
  "start-",
  "netsh",
  "ipconfig",
  "taskkill",
  "sc ",
];

interface ContextRule {
  test: (cmd: string) => boolean;
  context: string;
}

// Orden importa: la primera regla que matchea gana.
const CONTEXT_RULES: ContextRule[] = [
  {
    test: (cmd) => /^docker\s+exec/.test(cmd) || /^docker-compose\s+exec/.test(cmd),
    context: "Terminal del host — este comando ABRE una sesión dentro de un contenedor Docker",
  },
  {
    test: (cmd) => /^psql\b/.test(cmd),
    context: "Terminal del host — abre la consola de PostgreSQL (psql)",
  },
  {
    test: (cmd) => /^redis-cli\b/.test(cmd),
    context: "Terminal del host o de un contenedor — abre la consola de Redis",
  },
  {
    test: (cmd) => /^(select|update|delete\s+from|insert\s+into)\b/i.test(cmd),
    context: "Dentro de la consola SQL (psql/mysql ya abierto en el paso anterior)",
  },
  {
    test: (cmd) =>
      /^(get-|set-|restart-|stop-|start-)/i.test(cmd) ||
      /^(netsh|ipconfig|taskkill|sc\s)/i.test(cmd),
    context: "PowerShell o símbolo del sistema (Windows), no una terminal Linux",
  },
  {
    test: () => true,
    context: "Terminal del servidor Linux del tótem (acceso vía SSH)",
  },
];

// Explicación genérica por prefijo — "como agente experto en Linux": no
// intenta explicar cada variante exacta (imposible con reglas simples), da
// el propósito general del comando/herramienta para que un técnico sin
// experiencia Linux entienda qué está por hacer antes de ejecutarlo.
interface ExplanationRule {
  test: (cmd: string) => boolean;
  explanation: string;
}

const EXPLANATION_RULES: ExplanationRule[] = [
  { test: (c) => /^docker-compose\s+(down|stop)/.test(c), explanation: "Detiene (y en el caso de \"down\", elimina) los contenedores definidos en docker-compose.yml." },
  { test: (c) => /^docker-compose\s+(up|start)/.test(c), explanation: "Levanta/inicia los contenedores definidos en docker-compose.yml (\"-d\" = en segundo plano)." },
  { test: (c) => /^docker-compose\s+pull/.test(c), explanation: "Descarga la última versión de las imágenes Docker definidas en el compose." },
  { test: (c) => /^docker-compose\s+exec/.test(c), explanation: "Ejecuta un comando dentro de un contenedor que ya está corriendo." },
  { test: (c) => /^docker\s+exec/.test(c), explanation: "Abre una sesión (shell) dentro de un contenedor Docker que ya está corriendo." },
  { test: (c) => /^docker\s+logs/.test(c), explanation: "Muestra los logs de un contenedor (\"-f\" los sigue en vivo)." },
  { test: (c) => /^docker\s+(ps|volume|network)/.test(c), explanation: "Consulta/gestiona recursos de Docker (contenedores, volúmenes o redes)." },
  { test: (c) => /^cd\s/.test(c), explanation: "Cambia el directorio de trabajo actual de la terminal." },
  { test: (c) => /^sudo\s+(nano|vim|vi)\s/.test(c), explanation: "Abre el archivo indicado en un editor de texto con privilegios de administrador — para modificarlo, no solo verlo." },
  { test: (c) => /^(nano|vim|vi)\s/.test(c), explanation: "Abre el archivo indicado en un editor de texto en la terminal." },
  { test: (c) => /^sudo\s+systemctl/.test(c) || /^systemctl/.test(c), explanation: "Controla un servicio del sistema (start/stop/restart/status)." },
  { test: (c) => /^redis-cli\s+auth/.test(c), explanation: "Autentica la sesión de Redis con la contraseña configurada del servicio." },
  { test: (c) => /^redis-cli\b/.test(c), explanation: "Abre un cliente interactivo para consultar/administrar el servidor Redis." },
  { test: (c) => /^psql\b/.test(c), explanation: "Abre un cliente interactivo para consultar/administrar la base de datos PostgreSQL." },
  { test: (c) => /^curl\b/.test(c), explanation: "Hace una petición HTTP al endpoint indicado — útil para probar una API sin un navegador." },
  { test: (c) => /^(ssh|scp|pscp)\b/.test(c), explanation: "Se conecta a otro equipo por red (SSH) o transfiere archivos hacia/desde él (SCP/PSCP)." },
  { test: (c) => /^sudo\s+chmod|^chmod\b/.test(c), explanation: "Cambia los permisos de acceso (lectura/escritura/ejecución) del archivo o carpeta indicada." },
  { test: (c) => /^sudo\s+chown|^chown\b/.test(c), explanation: "Cambia el dueño (usuario/grupo) del archivo o carpeta indicada." },
  { test: (c) => /^(cat|grep|tail|head)\b/.test(c), explanation: "Muestra o filtra el contenido de un archivo en la terminal (sin modificarlo)." },
  { test: (c) => /^ls\b/.test(c), explanation: "Lista los archivos/carpetas del directorio indicado." },
  { test: (c) => /^rm\b/.test(c), explanation: "Elimina el archivo o carpeta indicada — irreversible, revisar bien la ruta antes de ejecutar." },
  { test: (c) => /^mkdir\b/.test(c), explanation: "Crea una carpeta nueva." },
  { test: (c) => /^(cp|mv)\b/.test(c), explanation: "Copia o mueve/renombra un archivo o carpeta." },
  { test: (c) => /^tar\b/.test(c), explanation: "Comprime o descomprime un archivo .tar/.tar.gz." },
  { test: (c) => /^crontab\b/.test(c), explanation: "Edita las tareas programadas (cron) del usuario actual." },
  { test: (c) => /^(sudo\s+)?date\b/.test(c), explanation: "Consulta o ajusta la fecha/hora del sistema." },
  { test: (c) => /^(sudo\s+)?hwclock/.test(c), explanation: "Sincroniza el reloj de hardware con la hora del sistema operativo." },
  { test: (c) => /^udevadm/.test(c), explanation: "Consulta información del kernel sobre un dispositivo (útil para saber a qué /dev le corresponde una impresora u otro periférico)." },
  { test: (c) => /^(apt-get|apt|dpkg|yum)\b/.test(c), explanation: "Instala, actualiza o gestiona paquetes de software del sistema operativo." },
  { test: (c) => /^git\b/.test(c), explanation: "Comando de control de versiones (git)." },
  { test: (c) => /^(npm|node)\b/.test(c), explanation: "Ejecuta un script/paquete de Node.js." },
  { test: (c) => /^(kill|killall)\b/.test(c), explanation: "Termina un proceso en ejecución por su PID (kill) o nombre (killall)." },
  { test: (c) => /^ps\b/.test(c), explanation: "Lista los procesos en ejecución." },
  { test: (c) => /^top\b/.test(c), explanation: "Muestra en vivo el uso de CPU/memoria por proceso." },
  { test: (c) => /^(df|du)\b/.test(c), explanation: "Muestra el espacio en disco usado/disponible." },
  { test: (c) => /^journalctl/.test(c), explanation: "Consulta los logs del sistema (systemd)." },
  { test: (c) => /^ping\b/.test(c), explanation: "Prueba la conectividad de red hacia el destino indicado." },
  { test: (c) => /^nc\b/.test(c), explanation: "Prueba si un puerto de red está abierto/alcanzable (netcat)." },
  { test: (c) => /^(reboot|shutdown)\b/.test(c), explanation: "Reinicia o apaga el equipo — asegurate de que sea el equipo correcto antes de ejecutarlo." },
  { test: (c) => /^zq\b/.test(c), explanation: "Comando propio de ZeroQ para controlar servicios del tótem (interfaz, impresora, etc.)." },
  { test: (c) => /^(xrandr|xinput)\b/.test(c), explanation: "Configura la pantalla (xrandr) o los dispositivos de entrada táctiles (xinput) del entorno gráfico Linux." },
  { test: (c) => /^\.\/(run|update)\.sh/.test(c), explanation: "Ejecuta el script propio de ZeroQ para levantar/actualizar el tótem." },
  { test: (c) => /^(get-|restart-|stop-|start-)/i.test(c), explanation: "Cmdlet de PowerShell (Windows) — consulta o controla un recurso/servicio de Windows." },
  { test: (c) => /^ipconfig/i.test(c), explanation: "Muestra la configuración de red del equipo Windows." },
  { test: (c) => /^netsh/i.test(c), explanation: "Configura parámetros de red en Windows." },
  { test: (c) => /^taskkill/i.test(c), explanation: "Termina un proceso en Windows por nombre o PID." },
];

const GENERIC_EXPLANATION =
  "Comando de sistema — revisa la documentación de la herramienta si el nombre no te resulta familiar antes de ejecutarlo.";

// Quita marcadores de lista (guion, "N.-", asterisco) que trae el texto
// crudo importado del runbook — no son parte del comando en sí.
function stripListMarker(line: string): string {
  return line.replace(/^\s*(?:\d+\.\-\s*|[-*]\s*)/, "").trim();
}

function isCommandLike(line: string): boolean {
  const lower = line.toLowerCase();
  return COMMAND_KEYWORDS.some((keyword) => lower.startsWith(keyword));
}

export function extractCommandAnnotations(markdown: string): CommandAnnotation[] {
  const annotations: CommandAnnotation[] = [];
  const seen = new Set<string>();

  for (const rawLine of markdown.split("\n")) {
    // Las líneas con indentación (tab o 2+ espacios) son casi siempre notas
    // explicativas sobre el comando anterior en este corpus, no comandos
    // nuevos — se saltan para no anotar prosa como si fuera un comando.
    if (/^[ \t]/.test(rawLine)) continue;

    const command = stripListMarker(rawLine);
    if (!command || !isCommandLike(command)) continue;
    if (seen.has(command)) continue;
    seen.add(command);

    const context = CONTEXT_RULES.find((rule) => rule.test(command))?.context ?? CONTEXT_RULES[CONTEXT_RULES.length - 1].context;
    const explanation = EXPLANATION_RULES.find((rule) => rule.test(command))?.explanation ?? GENERIC_EXPLANATION;

    annotations.push({ command, context, explanation });
  }

  return annotations;
}
