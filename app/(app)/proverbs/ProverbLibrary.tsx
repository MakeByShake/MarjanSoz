"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Pagination, PagerCompact } from "@/components/Pagination";
import { ArrowRightIcon, SearchIcon, SparklesIcon } from "@/components/Icons";
import { Masonry } from "@/components/Masonry";
import { AiExplainButton } from "@/components/MarjanApai";
import { BusyLabel, EmptyState, LoadError, Loading } from "@/components/ui";
import { AiError, savedLang, searchSituation } from "@/lib/ai/client";
import { type IndexedProverb, normalize, topicMeta, useLibrary } from "@/lib/proverbs";
import type { Topic } from "@/lib/types";

const PAGE_SIZE = 20;
const COLUMNS = [[768, 2]] as const;

type Mode = "words" | "situation";

export function ProverbLibrary() {
  const { proverbs, topics, loading, error } = useLibrary();
  const [mode, setMode] = useState<Mode>("words");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(1);

  // Поиск не блокирует ввод даже на тысячах мақалов
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery);
    return proverbs.filter((p) => (topic === "all" || p.topic === topic) && (!q || p.search.includes(q)));
  }, [proverbs, deferredQuery, topic]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    proverbs.forEach((p) => c.set(p.topic, (c.get(p.topic) ?? 0) + 1));
    return c;
  }, [proverbs]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const goTo = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) return <LoadError />;
  if (loading) return <Loading />;

  const tabs = <ModeTabs mode={mode} onMode={setMode} />;
  if (mode === "situation") {
    return (
      <div>
        {tabs}
        <SituationSearch proverbs={proverbs} topics={topics} />
      </div>
    );
  }

  return (
    <div>
      {tabs}
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Мақал іздеу</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Мақал не сөз іздеу..."
            className="field pl-11"
          />
        </label>
        <label className="sm:w-72">
          <span className="sr-only">Тақырып бойынша сүзу</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="all">Барлық тақырыптар ({topics.length})</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({counts.get(t.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-muted">
          {filtered.length} мақал табылды
        </p>
        <PagerCompact page={current} pages={pages} onPage={setPage} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon size={24} />} title="Ештеңе табылмады" text="Басқа сөзбен іздеп көріңіз." />
      ) : (
        <Masonry
          items={visible}
          breakpoints={COLUMNS}
          getKey={(p) => p.id}
          itemClassName={CARD}
          renderItem={(p) => <ProverbCard p={p} topics={topics} />}
        />
      )}

      <Pagination page={current} pages={pages} onPage={goTo} />
    </div>
  );
}

const CARD = "card relative flex flex-col overflow-hidden p-6 pl-14";

function ProverbCard({ p, topics, why }: { p: IndexedProverb; topics: Topic[]; why?: string }) {
  return (
    <>
      <span aria-hidden="true" className="absolute top-3 left-5 font-serif text-5xl leading-none text-gold/70">
        «
      </span>
      <p className="font-serif text-lg leading-snug font-medium text-proverb italic">{p.text}</p>
      {why && (
        <p className="mt-3 rounded-lg border-l-2 border-gold bg-gold/8 px-3 py-2 text-[15px]">
          <span className="mb-0.5 block text-xs font-semibold tracking-[0.14em] text-gold-text uppercase">Неге сәйкес</span>
          {why}
        </p>
      )}
      <p className="mt-3 flex-1 text-[15px]">{p.explanation || <span className="text-muted">Түсіндірмесі әлі қосылмаған.</span>}</p>
      {p.translation_ru && (
        <p lang="ru" className="mt-2 text-sm text-muted">
          {p.translation_ru}
        </p>
      )}
      <p className="mt-4 border-t border-line pt-3 text-xs font-semibold tracking-[0.14em] text-gold-text uppercase">{topicMeta(topics, p.topic).title}</p>
      <div className="mt-3">
        <AiExplainButton kind="proverb" id={p.id} />
      </div>
    </>
  );
}

function ModeTabs({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  const tab = (m: Mode) =>
    `inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
      mode === m ? "bg-card text-heading shadow-sm ring-1 ring-line" : "text-muted hover:text-heading"
    }`;
  return (
    <div role="tablist" aria-label="Іздеу түрі" className="mb-4 inline-flex rounded-xl border border-line bg-bg p-1">
      <button type="button" role="tab" aria-selected={mode === "words"} onClick={() => onMode("words")} className={tab("words")}>
        <SearchIcon size={16} />
        Сөз бойынша
      </button>
      <button type="button" role="tab" aria-selected={mode === "situation"} onClick={() => onMode("situation")} className={tab("situation")}>
        <SparklesIcon size={16} className="text-gold" />
        Жағдай бойынша
      </button>
    </div>
  );
}

const EXAMPLES = ["Досым уәдесін орындамады", "Сабаққа ерінемін", "Ата-анамды ренжітіп алдым", "Жарысқа дайындалып жүрмін"];

/** Ученик описывает ситуацию — Маржан апай находит подходящие мақалы в нашей библиотеке. */
function SituationSearch({ proverbs, topics }: { proverbs: IndexedProverb[]; topics: Topic[] }) {
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [picks, setPicks] = useState<{ p: IndexedProverb; why: string }[] | null>(null);
  const abort = useRef<AbortController | null>(null);
  const byId = useMemo(() => new Map(proverbs.map((p) => [p.id, p])), [proverbs]);

  useEffect(() => () => abort.current?.abort(), []);

  async function find(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setQuery(q);
    setAsked(q);
    setBusy(true);
    setError("");
    try {
      const res = await searchSituation(q, savedLang(), ctrl.signal);
      setPicks(res.items.flatMap((x) => (byId.has(x.id) ? [{ p: byId.get(x.id)!, why: x.why }] : [])));
      setNotice(res.notice);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof AiError ? e.message : "Маржан апай жауап бере алмады. Қайталап көріңіз.");
    } finally {
      if (abort.current === ctrl) setBusy(false);
    }
  }

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          find(query);
        }}
        className="mb-3 flex flex-col gap-3 sm:flex-row"
      >
        <label className="relative flex-1">
          <span className="sr-only">Жағдайыңызды сипаттаңыз</span>
          <SparklesIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gold" />
          <input
            type="search"
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Жағдайыңды жаз: мысалы, досым уәдесін орындамады"
            className="field pl-11"
          />
        </label>
        <button type="submit" disabled={busy || query.trim().length < 3} className="btn-primary sm:w-44">
          {busy ? <BusyLabel>Іздеуде...</BusyLabel> : "Мақал тап"}
        </button>
      </form>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Мысалы:</span>
        {EXAMPLES.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => find(x)}
            className="cursor-pointer rounded-full border border-line px-3 py-1 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {x}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </p>
      )}

      {picks === null ? (
        !busy && (
          <EmptyState
            icon={<SparklesIcon size={24} />}
            title="Маржан апай мақал тауып береді"
            text="Басыңнан өткен жағдайды не айтқың келген ойды жаз — кітапханадан соған сай мақалдарды тауып, неге сәйкес екенін түсіндіреді."
          />
        )
      ) : (
        <div aria-live="polite" aria-busy={busy}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              «{asked}» — {picks.length} мақал табылды
            </p>
            <Link
              href={`/apai?q=${encodeURIComponent(asked)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-text underline-offset-4 hover:underline"
            >
              Маржан апаймен сөйлесу
              <ArrowRightIcon size={16} />
            </Link>
          </div>
          {notice && <p className="mb-4 text-sm text-gold-text">{notice}</p>}
          {picks.length === 0 ? (
            <EmptyState icon={<SearchIcon size={24} />} title="Сәйкес мақал табылмады" text="Жағдайды басқаша, толығырақ жазып көріңіз." />
          ) : (
            <Masonry
              items={picks}
              breakpoints={COLUMNS}
              getKey={(x) => x.p.id}
              itemClassName={CARD}
              renderItem={(x) => <ProverbCard p={x.p} topics={topics} why={x.why} />}
            />
          )}
        </div>
      )}
    </div>
  );
}
