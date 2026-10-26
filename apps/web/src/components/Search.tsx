import { useEffect, useMemo, useState } from "preact/hooks";
import { useT } from "../i18n";
import type { Lang } from "../i18n";

export interface SearchEntry {
  type: "soc" | "case" | "box";
  href: string;
  title: string;
  text: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Search({ entries, lang }: { entries: SearchEntry[]; lang: Lang }) {
  const t = useT(lang);
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  const results = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return entries.filter((e) => {
      const hay = norm(`${e.title} ${e.text}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [q, entries]);

  return (
    <div>
      <div class="field">
        <label for="q">{t.search.label}</label>
        <input
          id="q"
          type="search"
          value={q}
          onInput={(e) => {
            const value = (e.currentTarget as HTMLInputElement).value;
            setQ(value);
            window.history.replaceState(
              null,
              "",
              value ? `?q=${encodeURIComponent(value)}` : window.location.pathname,
            );
          }}
          autocomplete="off"
        />
      </div>
      <div aria-live="polite">
        {q.trim() !== "" && results.length === 0 && <p class="muted">{t.search.none}</p>}
        <ul class="plain">
          {results.map((r) => (
            <li key={r.href} class="card">
              <span class="tag">
                {r.type === "soc"
                  ? t.search.typeSoc
                  : r.type === "box"
                    ? t.search.typeBox
                    : t.search.typeCase}
              </span>{" "}
              <a href={r.href}>{r.title}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
