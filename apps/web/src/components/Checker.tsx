import { useEffect, useMemo, useState } from "preact/hooks";
import type { CheckInput, CriterionResult, Database, Verdict } from "@tvbox-check/core";
import {
  evaluate,
  findModel,
  findSoc,
  modelsForSoc,
  normalizeName,
  socsForModel,
} from "@tvbox-check/core/rules";
import { fmt, routePath, useT } from "../i18n";
import type { Lang } from "../i18n";
import type { Strings } from "../i18n/fr";

interface Props {
  db: Database;
  repo: string;
  lang: Lang;
}

interface FormState {
  soc: string;
  model: string;
  ram: string;
  storage: string;
  ethernet: string;
  video: string;
}

const EMPTY: FormState = { soc: "", model: "", ram: "", storage: "", ethernet: "", video: "" };
const PARAMS: Record<keyof FormState, string> = {
  soc: "soc",
  model: "modele",
  ram: "ram",
  storage: "stockage",
  ethernet: "ethernet",
  video: "video",
};

function readUrl(): FormState {
  const p = new URLSearchParams(window.location.search);
  const state = { ...EMPTY };
  for (const k of Object.keys(PARAMS) as (keyof FormState)[]) state[k] = p.get(PARAMS[k]) ?? "";
  return state;
}

function toQuery(state: FormState): string {
  const p = new URLSearchParams();
  for (const k of Object.keys(PARAMS) as (keyof FormState)[]) {
    if (state[k].trim()) p.set(PARAMS[k], state[k].trim());
  }
  return p.toString();
}

function toNumber(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

function toInput(s: FormState): CheckInput {
  const input: CheckInput = {};
  if (s.soc.trim()) input.soc = s.soc.trim();
  if (s.model.trim()) input.modelName = s.model.trim();
  const ram = toNumber(s.ram);
  if (ram !== undefined) input.ramGb = ram;
  const storage = toNumber(s.storage);
  if (storage !== undefined) input.storageGb = storage;
  if (s.ethernet === "100M" || s.ethernet === "1G" || s.ethernet === "none") {
    input.ethernet = s.ethernet;
  }
  if (s.video === "1080p" || s.video === "4K" || s.video === "6K" || s.video === "8K") {
    input.videoMax = s.video;
  }
  return input;
}

function VerdictPill({ verdict, t }: { verdict: Verdict; t: Strings }) {
  const v = t.verdicts[verdict];
  return (
    <span class={`pill v-${verdict}`}>
      <span aria-hidden="true">{v.icon} </span>
      {v.label}
    </span>
  );
}

export default function Checker({ db, repo, lang }: Props) {
  const t = useT(lang);
  const colon = lang === "fr" ? " : " : ": ";
  const sourceTitle = (s: { title: string }) =>
    (lang === "en" && (s as { title_en?: string | null }).title_en) || s.title;
  const [state, setState] = useState<FormState>(EMPTY);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setState(readUrl());
  }, []);

  const setField = (key: keyof FormState, value: string) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      const qs = toQuery(next);
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      return next;
    });
    setCopied(false);
  };

  const update = (key: keyof FormState) => (e: Event) =>
    setField(key, (e.currentTarget as HTMLInputElement | HTMLSelectElement).value);

  const input = useMemo(() => toInput(state), [state]);
  const hasInput = Boolean(input.soc || input.modelName);
  const result = useMemo(
    () => (hasInput ? evaluate(input, db, lang) : null),
    [input, db, hasInput, lang],
  );
  const sourceMap = useMemo(() => new Map(db.sources.map((s) => [s.id, s])), [db]);
  const matchedSoc = input.soc ? findSoc(db, input.soc) : undefined;
  const socNotFound = Boolean(input.soc) && !matchedSoc;

  // Suggestions : le modèle saisi restreint (sans l'interdire) les SoC proposés, et inversement.
  const matchedModel = input.modelName ? findModel(db, input.modelName) : undefined;
  const knownSocs = useMemo(
    () => (matchedModel ? socsForModel(db, matchedModel) : []),
    [db, matchedModel],
  );
  const reportedSocIds = useMemo(() => {
    const q = normalizeName(state.model);
    if (!q) return new Set<string>();
    const ids = new Set<string>(
      db.cases
        .filter((c) => normalizeName(c.marketed_name) === q)
        .flatMap((c) => [c.marketed.soc, c.observed.soc])
        .filter((id): id is string => Boolean(id)),
    );
    if (matchedModel) {
      for (const s of socsForModel(db, matchedModel, "reported")) ids.add(s.id);
    }
    return ids;
  }, [db, state.model, matchedModel]);
  const orderedSocs = useMemo(() => {
    const knownIds = new Set(knownSocs.map((x) => x.id));
    const rank = (id: string) => (knownIds.has(id) ? 0 : reportedSocIds.has(id) ? 1 : 2);
    return db.socs
      .map((x, i) => ({ soc: x, i, r: rank(x.id) }))
      .sort((p, q) => p.r - q.r || p.i - q.i);
  }, [db, knownSocs, reportedSocIds]);
  const modelChips = useMemo(
    () => (matchedSoc && !matchedModel ? modelsForSoc(db, matchedSoc.id).slice(0, 8) : []),
    [db, matchedSoc, matchedModel],
  );
  const modelNotInCatalog =
    Boolean(input.modelName) && !matchedModel && db.models.length > 0 && reportedSocIds.size === 0;

  const reportUrl = repo
    ? `https://github.com/${repo}/issues/new?${new URLSearchParams({
        template: "nouveau-cas.yml",
        title: `Cas : ${state.model || state.soc || "box"}`,
        model: state.model,
        soc: state.soc,
      }).toString()}`
    : null;
  const addSocUrl = repo
    ? `https://github.com/${repo}/issues/new?${new URLSearchParams({
        template: "correction-donnee.yml",
        title: `Ajouter le SoC : ${state.soc}`,
      }).toString()}`
    : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const hasQuery = toQuery(state) !== "";

  return (
    <div>
      <form class="checker" onSubmit={(e) => e.preventDefault()} aria-label={t.home.title}>
        <div class="field">
          <label for="f-model">{t.form.model}</label>
          <input
            id="f-model"
            list="dl-models"
            value={state.model}
            onInput={update("model")}
            autocomplete="off"
          />
          <datalist id="dl-models">
            {db.cases.map((c) => (
              <option key={c.id} value={c.marketed_name} />
            ))}
          </datalist>
          <span class="hint">{t.form.modelHint}</span>
        </div>
        <div class="field">
          <label for="f-soc">{t.form.soc}</label>
          <input
            id="f-soc"
            list="dl-socs"
            value={state.soc}
            onInput={update("soc")}
            autocomplete="off"
          />
          <datalist id="dl-socs">
            {orderedSocs.map(({ soc: x, r }) => (
              <option
                key={x.id}
                value={x.name}
                label={`${x.vendor} ${x.name}${
                  r === 0 ? ` (${t.form.groupKnown})` : r === 1 ? ` (${t.form.groupReported})` : ""
                }`}
              />
            ))}
          </datalist>
          {knownSocs.length > 0 && (
            <span class="hint">
              {t.form.socSuggestKnown}{" "}
              {knownSocs.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  class="chip"
                  onClick={() => setField("soc", x.name)}
                >
                  {x.vendor} {x.name}
                </button>
              ))}
            </span>
          )}
          {modelChips.length > 0 && (
            <span class="hint">
              {t.form.socSuggestModel}{" "}
              {modelChips.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  class="chip"
                  onClick={() => setField("model", x.name)}
                >
                  {x.name}
                </button>
              ))}
            </span>
          )}
          {modelNotInCatalog && <span class="hint">{t.form.modelNotInCatalog}</span>}
          <span class="hint">{t.form.socHint}</span>
        </div>
        <div class="field">
          <label for="f-ram">{t.form.ram}</label>
          <input
            id="f-ram"
            type="number"
            inputMode="decimal"
            min="0.25"
            step="0.25"
            value={state.ram}
            onInput={update("ram")}
          />
        </div>
        <div class="field">
          <label for="f-storage">{t.form.storage}</label>
          <input
            id="f-storage"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            value={state.storage}
            onInput={update("storage")}
          />
        </div>
        <div class="field">
          <label for="f-eth">{t.form.ethernet}</label>
          <select id="f-eth" value={state.ethernet} onChange={update("ethernet")}>
            <option value="">{t.form.unspecified}</option>
            <option value="100M">{t.form.ethernetOptions["100M"]}</option>
            <option value="1G">{t.form.ethernetOptions["1G"]}</option>
            <option value="none">{t.form.ethernetOptions.none}</option>
          </select>
        </div>
        <div class="field">
          <label for="f-video">{t.form.video}</label>
          <select id="f-video" value={state.video} onChange={update("video")}>
            <option value="">{t.form.unspecified}</option>
            <option value="1080p">1080p</option>
            <option value="4K">4K</option>
            <option value="6K">6K</option>
            <option value="8K">8K</option>
          </select>
        </div>
      </form>

      <div class="actions">
        {hasQuery && (
          <button
            type="button"
            class="btn secondary"
            onClick={() => {
              setState(EMPTY);
              window.history.replaceState(null, "", window.location.pathname);
              setCopied(false);
            }}
          >
            {t.form.reset}
          </button>
        )}
      </div>

      <section aria-labelledby="result-title" aria-live="polite">
        <h2 id="result-title" class="muted" style="font-size:1rem;margin-top:0.5rem">
          {t.result.title}
        </h2>
        {!result && <p class="muted">{t.result.empty}</p>}
        {result && (
          <div>
            <div class={`verdict v-${result.overall}`} role="status">
              <span class="icon" aria-hidden="true">
                {t.verdicts[result.overall].icon}
              </span>
              <div>
                <h3 style="margin:0 0 0.25rem;font-size:1.35rem">
                  {t.verdicts[result.overall].label}
                </h3>
                <p>{t.verdictSummary[result.overall]}</p>
                {result.overall === "plausible" && (
                  <p style="margin-top:0.4rem">
                    <strong>{t.result.plausibleCaveat}</strong>{" "}
                    <a href={routePath(lang, "guide")}>{t.result.plausibleLink}</a>.
                  </p>
                )}
              </div>
            </div>

            {result.criteria.length === 0 && !socNotFound && (
              <p class="muted">{t.result.noCriteria}</p>
            )}

            <ul class="criteria">
              {result.criteria.map((c: CriterionResult, i) => (
                <li key={`${c.criterion}-${i}`}>
                  <p style="margin:0 0 0.3rem">
                    <VerdictPill verdict={c.verdict} t={t} />
                    <strong>{t.criteria[c.criterion]}</strong>
                  </p>
                  <p style="margin:0 0 0.4rem">{c.message}</p>
                  <p style="margin:0 0 0.4rem">
                    {c.status && <span class={`tag ${c.status}`}>{t.status[c.status]}</span>}
                    {c.basis && (
                      <span class="tag">
                        {t.result.basisLabel}
                        {colon}
                        {t.basis[c.basis]}
                      </span>
                    )}
                    {c.claimed !== undefined && c.limit !== undefined && (
                      <span class="tag">
                        {fmt(t.result.claimedLimit, {
                          claimed: String(c.claimed),
                          limit: String(c.limit),
                        })}
                      </span>
                    )}
                  </p>
                  {c.case && (
                    <p style="margin:0 0 0.4rem">
                      <a href={routePath(lang, "cases", c.case.id)}>{t.result.viewCase}</a>
                    </p>
                  )}
                  {c.sources.length > 0 && (
                    <p class="hint" style="margin:0">
                      {t.result.sources}
                      {colon}
                      {c.sources.map((id, j) => {
                        const s = sourceMap.get(id);
                        return s ? (
                          <span key={id}>
                            {j > 0 && " · "}
                            <a href={s.url} rel="noopener noreferrer" target="_blank">
                              {sourceTitle(s)}
                            </a>
                          </span>
                        ) : null;
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {matchedSoc && (
              <p>
                <a href={routePath(lang, "soc", matchedSoc.id)}>{t.result.viewSoc}</a>
              </p>
            )}
            {socNotFound && (
              <p class="notice">
                {t.result.unknownSoc}{" "}
                {addSocUrl ? (
                  <a href={addSocUrl} rel="noopener noreferrer" target="_blank">
                    {t.result.addSoc}
                  </a>
                ) : (
                  <a href={routePath(lang, "contribute")}>{t.result.addSoc}</a>
                )}
              </p>
            )}

            <div class="actions">
              {hasQuery && (
                <button type="button" class="btn secondary" onClick={copyLink}>
                  {copied ? t.result.copied : t.result.copy}
                </button>
              )}
              {reportUrl ? (
                <a class="btn secondary" href={reportUrl} rel="noopener noreferrer" target="_blank">
                  {t.result.report}
                </a>
              ) : (
                <a class="btn secondary" href={routePath(lang, "contribute")}>
                  {t.result.report}
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
