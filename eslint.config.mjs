import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Fija la versión de React explícitamente: eslint-plugin-react@7.37.5
    // crashea al auto-detectarla contra ESLint 10 (context.getFilename ya
    // no existe en la API de contexto de flat config) — ver
    // https://github.com/jsx-eslint/eslint-plugin-react/issues (bug conocido).
    settings: {
      react: {
        version: "19.2.8",
      },
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "generated/**",
    // Config/infra en JS/TS plano, sin JSX — evita un crash conocido de
    // eslint-plugin-react (regla react/display-name) al intentar detectar
    // la versión de React sobre archivos que no son componentes.
    "eslint.config.mjs",
    "postcss.config.mjs",
    "next.config.ts",
    "prisma.config.ts",
    "proxy.ts",
    "prisma/seed.ts",
  ]),
]);

export default eslintConfig;
