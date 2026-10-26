import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";

// Domaine provisoire : à remplacer par l'URL définitive (voir src/config.ts).
export default defineConfig({
  site: "https://tvbox-check.nm-labs.dev",
  integrations: [
    preact(),
    sitemap({
      i18n: { defaultLocale: "fr", locales: { fr: "fr-FR", en: "en-US" } },
    }),
  ],
  build: { format: "directory" },
});
