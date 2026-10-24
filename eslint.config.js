import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "apps/web/.astro/**", "data/schema/**"] },
  ...tseslint.configs.recommended,
);
