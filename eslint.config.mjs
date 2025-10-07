import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ✅ Load base Next.js + TypeScript rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ Add our custom rules
  {
    rules: {
      // Allow use of `any` in backend/server utility code
      "@typescript-eslint/no-explicit-any": "off",

      // Allow using <img> instead of next/image (for admin UI simplicity)
      "@next/next/no-img-element": "off",

      // Suppress false positives for temporarily unused variables (e.g. _req)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Optionally reduce console warnings
      "no-console": "off",
    },

    // Ignore build + framework folders
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;