import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The runner site is bilingual: links and redirects must keep the visitor's language.
    files: ["src/app/[[]lang]/**", "src/components/**"],
    ignores: ["src/components/organizer-bar.tsx", "src/components/backoffice.tsx", "src/components/not-found-thai.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        { name: "next/link", message: "Use Link from @/i18n/link: it keeps /en on English pages." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
