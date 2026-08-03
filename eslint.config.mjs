import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["data/**", "public/sw.js"],
  },
  {
    // The db layer works with raw sqlite rows and intentionally types them
    // as `any` rather than hand-writing row shapes for every query. Keep
    // this visible as a warning without failing `npm run lint`.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",

      // `const { id: _, ...fields } = body` es la forma idiomática de sacar
      // una clave de un objeto, y el guion bajo dice justo lo que se quiere
      // decir: "esto sobra". Marcarlo como variable sin usar era ruido que
      // tapaba las variables sin usar de verdad.
      "@typescript-eslint/no-unused-vars": ["warn", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
    },
  },
];

export default eslintConfig;
