"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteTopic, saveTopic } from "@/lib/admin";
import type { Topic } from "@/lib/types";
import { Panel, StatusLine, TextField, useAction, type LibraryState } from "./shared";
import { BusyLabel } from "@/components/ui";

// Код темы (поле topic у мақала): латиница, цифры и дефис
const ID_PATTERN = /^[a-z0-9-]{2,40}$/;

export function TopicsPanel({ library }: { library: LibraryState }) {
  const { topics, proverbs } = library;
  const { busy, status, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Topic | null>(null);

  const counts = new Map<string, number>();
  proverbs.forEach((p) => counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1));
  const nextOrder = Math.max(0, ...topics.map((t) => t.order)) + 1;

  return (
    <div className="space-y-6">
      <Panel
        title="Жаңа тақырып"
        action={
          !adding && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              ＋ Тақырып қосу
            </button>
          )
        }
      >
        {adding ? (
          <TopicForm
            isNew
            busy={busy}
            existingIds={topics.map((t) => t.id)}
            initial={{ id: "", title: "", description: "", icon: "📜", order: nextOrder }}
            onCancel={() => setAdding(false)}
            onSubmit={async (t) => {
              if (await run(() => saveTopic(t), "Тақырып қосылды")) setAdding(false);
            }}
          />
        ) : (
          <p className="text-sm text-muted">Тақырып = кітапханадағы мақалдар санаты (сүзгі). Сабақтар «Сабақтар» бөлімінде бөлек жасалады.</p>
        )}
        <StatusLine status={status} />
      </Panel>

      <Panel title={`Тақырыптар (${topics.length})`}>
        {topics.length === 0 && <p className="text-muted">Тақырыптар әлі жоқ.</p>}
        <ul className="divide-y divide-line">
          {topics.map((t) => {
            const count = counts.get(t.id) ?? 0;
            return (
              <li key={t.id} className="py-4">
                {editing === t.id ? (
                  <TopicForm
                    busy={busy}
                    existingIds={[]}
                    initial={t}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (next) => {
                      if (await run(() => saveTopic(next), "Тақырып сақталды")) setEditing(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span aria-hidden="true" className="text-3xl">
                      {t.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {t.title} <span className="text-sm font-normal text-muted">· {count} мақал · №{t.order}</span>
                      </p>
                      <p className="text-sm text-muted">{t.description}</p>
                                          </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-sm" onClick={() => setEditing(t.id)}>
                        Өңдеу
                      </button>
                      <button
                        type="button"
                        disabled={count > 0}
                        title={count > 0 ? "Алдымен осы тақырыптың мақалдарын жойыңыз немесе басқа тақырыпқа ауыстырыңыз" : undefined}
                        className="inline-flex min-h-9 items-center rounded-lg border border-red-700/50 px-3 py-1 text-sm text-red-800 transition hover:bg-red-700/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-200"
                        onClick={() => setDeleting(t)}
                      >
                        Жою
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Ішінде мақалы бар тақырыпты жоюға болмайды.</p>
      </Panel>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `«${deleting.title}» тақырыбын жоясыз ба?` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) run(() => deleteTopic(deleting.id), "Тақырып жойылды");
        }}
      />
    </div>
  );
}

function TopicForm({
  initial,
  isNew,
  existingIds,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: Topic;
  isNew?: boolean;
  existingIds: string[];
  busy: boolean;
  onSubmit: (t: Topic) => void;
  onCancel: () => void;
}) {
  const [t, setT] = useState(initial);
  const [error, setError] = useState("");
  const set = (k: keyof Topic) => (v: string) => setT((x) => ({ ...x, [k]: k === "order" ? Number(v) || 0 : v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...t, id: t.id.trim(), title: t.title.trim(), description: t.description.trim(), icon: t.icon.trim() || "📜" };
    if (!next.title) return setError("Атауын жазыңыз");
    if (isNew && !ID_PATTERN.test(next.id)) return setError("Коды: тек кіші латын әріптері, сандар және «-» (мысалы: dostyk)");
    if (isNew && existingIds.includes(next.id)) return setError("Мұндай коды бар тақырып бар");
    setError("");
    onSubmit(next);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-gold/50 bg-bg p-4">
      <TextField label="Атауы" value={t.title} onChange={set("title")} required placeholder="Мысалы: Достық жайлы" />
      <TextField label="Сипаттамасы" value={t.description} onChange={set("description")} placeholder="Достық туралы мақалдар" />
      <div className="grid gap-3 sm:grid-cols-3">
        {isNew ? (
          <TextField label="Коды (латынша)" value={t.id} onChange={(v) => set("id")(v.toLowerCase())} required placeholder="dostyk" />
        ) : (
          <p className="text-sm">
            <span className="mb-1 block font-medium">Коды</span>
            <span className="text-muted">{t.id}</span>
          </p>
        )}
        <TextField label="Белгіше (эмодзи)" value={t.icon} onChange={set("icon")} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Реті</span>
          <input type="number" min={0} value={t.order} onChange={(e) => set("order")(e.target.value)} className="field" />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800 dark:text-red-200">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Болдырмау
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <BusyLabel>Сақталуда...</BusyLabel> : isNew ? "Қосу" : "Сақтау"}
        </button>
      </div>
    </form>
  );
}
