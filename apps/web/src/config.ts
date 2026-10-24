/**
 * Réglages du site. À renseigner une fois le dépôt GitHub créé :
 * - `repo` : « propriétaire/nom » du dépôt public ;
 * - `giscus` : identifiants fournis par https://giscus.app (Discussions activées sur le dépôt).
 * Tant que `repo` est vide, les liens GitHub et les commentaires sont masqués.
 */
export const config = {
  siteName: "tvbox-check",
  siteUrl: "https://tvbox-check.nm-labs.fr",
  repo: "" as string,
  giscus: {
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
