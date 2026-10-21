"use client";

import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { addProverb, deleteProverb, updateProverb, type ProverbInput } from "@/lib/admin";
import { normalize, topicMeta, type IndexedProverb } from "@/lib/proverbs";
import type { Topic } from "@/lib/types";
import { Panel, StatusLine, TextField, useAction, type LibraryState } from "./shared";

const PAGE_SIZE = 20;

export function ProverbsPanel({ library }: { library: LibraryState }) {
  const { proverbs, topics } = library;
  const { busy, status, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<IndexedProverb | null>(null);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferred);
    return proverbs.filter((p) => (topic === "all" || p.topic === topic) && (!q || p.search.includes(q)));
  }, [proverbs, deferred, topic]);
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    proverbs.forEach((p) => c.set(p.topic, (c.get(p.topic) ?? 0) + 1));
    return c;
  }, [proverbs]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const explained = proverbs.filter((p) => p.explanation.trim()).length;

  if (topics.length === 0) {
    return (
      <Panel title="Мақалдар">
        <p className="text-muted">Алдымен «Тақырыптар» бөлімінде кемінде бір тақырып жасаңыз немесе «Импорт» арқылы деректерді жүктеңіз.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Жаңа мақал"
        action={
          !adding && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              ＋ Мақал қосу
            </button>
          )
        }
      >
        {adding ? (
          <ProverbForm
            topics={topics}
            busy={busy}
            initial={{ text: "", translation_ru: "", explanation: "", topic: topic !== "all" ? topic : topics[0].id }}
            submitLabel="Қосу"
            onCancel={() => setAdding(false)}
            onSubmit={async (data) => {
              if (await run(() => addProverb(data), "Мақал қосылды")) setAdding(false);
            }}
          />
        ) : (
          <p className="text-sm text-muted">Мақал бірден сайтта пайда болады. Көп мақалды бірге жүктеу үшін «Импорт» бөлімін қолданыңыз.</p>
        )}
        <StatusLine status={status} />
      </Panel>

      <Panel title={`Барлық мақалдар (${filtered.length})`}>
        <p className="mb-3 text-sm text-muted">
          Түсіндірмесі бар: {explained} / {proverbs.length}. Бет: {current} / {pages}.
        </p>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Мақал іздеу</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Мақал іздеу..."
              className="field"
            />
          </label>
          <label className="sm:w-64">
            <span className="sr-only">Тақырып бойынша сүзу</span>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setPage(1);
              }}
              className="field"
            >
              <option value="all">Барлық тақырыптар</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.title} ({counts.get(t.id) ?? 0})
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="divide-y divide-line">
          {visible.map((p) => (
            <li key={p.id} className="py-4">
              {editing === p.id ? (
                <ProverbForm
                  topics={topics}
                  busy={busy}
                  initial={p}
                  submitLabel="Сақтау"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (data) => {
                    if (await run(() => updateProverb(p.chunk, { id: p.id, ...data }), "Өзгерістер сақталды")) setEditing(null);
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif italic text-proverb">«{p.text}»</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{p.explanation}</p>
                    <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary-dark dark:bg-gold/15 dark:text-gold">
                      {topicMeta(topics, p.topic).title}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-sm" onClick={() => setEditing(p.id)}>
                      Өңдеу
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center rounded-lg border border-red-700/50 px-3 py-1 text-sm text-red-800 transition hover:bg-red-700/10 dark:text-red-200"
                      onClick={() => setDeleting(p)}
                    >
                      Жою
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="py-8 text-center text-muted">Ештеңе табылмады.</p>}
        <Pagination page={current} pages={pages} onPage={setPage} />
      </Panel>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `«${deleting.text}» мақалын жоясыз ба?` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) run(() => deleteProverb(deleting.chunk, deleting.id), "Мақал жойылды");
        }}
      />
    </div>
  );
}

function ProverbForm({
  topics,
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  topics: Topic[];
  initial: ProverbInput;
  busy: boolean;
  submitLabel: string;
  onSubmit: (data: ProverbInput) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<ProverbInput>({
    text: initial.text,
    translation_ru: initial.translation_ru ?? "",
    explanation: initial.explanation,
    topic: initial.topic,
  });
  const set = (k: keyof ProverbInput) => (v: string) => setData((d) => ({ ...d, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = {
      text: data.text.trim(),
      translation_ru: data.translation_ru.trim(),
      explanation: data.explanation.trim(),
      topic: data.topic,
    };
    if (!clean.text) return;
    onSubmit(clean);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-gold/50 bg-bg p-4">
      <TextField label="Мақал мәтіні" value={data.text} onChange={set("text")} required placeholder="Мысалы: Білім — инемен құдық қазғандай" />
      <TextField label="Мағынасы (түсіндірме)" value={data.explanation} onChange={set("explanation")} multiline hint="Міндетті емес, бірақ «Мағынасын тап» сұрақтары үшін керек" />
      <TextField label="Орысша аудармасы" value={data.translation_ru} onChange={set("translation_ru")} lang="ru" hint="Міндетті емес" />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Тақырып</span>
        <select value={data.topic} onChange={(e) => set("topic")(e.target.value)} className="field">
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Болдырмау
        </button>
        <button type="submit" className="btn-primary" disabled={busy || !data.text.trim()}>
          {busy ? "Сақталуда..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
