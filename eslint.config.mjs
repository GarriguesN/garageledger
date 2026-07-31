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
    },
  },
];

export default eslintConfig;
