/**
 * Réglages du site. À renseigner une fois le dépôt GitHub créé :
 * - `repo` : « propriétaire/nom » du dépôt de code (liens de signalement) ;
 * - `giscus` : dépôt de commentaires + identifiants fournis par https://giscus.app
 *   (dépôt public, Discussions activées, application giscus installée).
 * Tant que `repoId` et `categoryId` sont vides, les commentaires restent masqués.
 */
export const config = {
  siteName: "tvbox-check",
  siteUrl: "https://tvbox-check.nm-labs.fr",
  repo: "Nicolasmar91/tvbox-check",
  giscus: {
    // Dépôt dédié aux commentaires (Discussions), distinct du dépôt de code.
    repo: "Nicolasmar91/tvbox-check-commentaire",
    repoId: "" as string,
    category: "Commentaires",
    categoryId: "" as string,
  },
  contactEmail: "nicolasmar91@gmail.com",
};

export function issueUrl(template: string, params: Record<string, string> = {}): string | null {
  if (!config.repo) return null;
  const qs = new URLSearchParams({ template, ...params });
  return `https://github.com/${config.repo}/issues/new?${qs.toString()}`;
}
