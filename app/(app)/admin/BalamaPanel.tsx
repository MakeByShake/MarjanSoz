"use client";

import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { editBalama, newBalamaId, parseBalamaImport, useBalama, type BalamaImportRow } from "@/lib/balama";
import { normalize } from "@/lib/proverbs";
import type { BalamaWord } from "@/lib/types";
import { dangerBtn, Panel, smallBtn, StatusLine, TextField, useAction } from "./shared";
import { BusyLabel } from "@/components/ui";

const PAGE_SIZE = 30;
type Input = Omit<BalamaWord, "id">;

export function BalamaPanel() {
  const { words, saved } = useBalama();
  const { busy, status, run, setStatus } = useAction();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BalamaWord | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [rows, setRows] = useState<BalamaImportRow[] | null>(null);
  const [replace, setReplace] = useState(false);
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferred);
    return words.filter((w) => !q || normalize(`${w.text} ${w.definition}`).includes(q)).reverse();
  }, [words, deferred]);
  const visible = filtered.slice(0, limit);

  async function onFile(file: File | undefined) {
    setRows(null);
    setStatus(null);
    if (!file) return;
    try {
      const parsed = parseBalamaImport(JSON.parse(await file.text()));
      if ("error" in parsed) setStatus({ kind: "error", text: parsed.error });
      else setRows(parsed.rows);
    } catch {
      setStatus({ kind: "error", text: "Файлды оқу мүмкін болмады: JSON дұрыс емес" });
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Жаңа балама сөз"
        action={
          !adding && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              ＋ Балама сөз қосу
            </button>
          )
        }
      >
        {!saved && (
          <p className="mb-3 rounded-lg border border-gold/50 bg-bg p-3 text-sm">
            Қазір сайттағы бастапқы {words.length} сөз көрсетіліп тұр. Алғашқы өзгерістен кейін олар базаға сақталады.
          </p>
        )}
        {adding && (
          <BalamaForm
            initial={{ text: "", definition: "", icon: "🎭" }}
            busy={busy}
            submitLabel="Қосу"
            onCancel={() => setAdding(false)}
            onSubmit={async (w) => {
              if (await run(() => editBalama((items) => [...items, { id: newBalamaId(), ...w }]), "Балама сөз қосылды")) setAdding(false);
            }}
          />
        )}
        <StatusLine status={status} />
      </Panel>

      <Panel title={`Балама сөздер (${filtered.length})`}>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
          placeholder="Іздеу..."
          aria-label="Балама сөз іздеу"
          className="field mb-4"
        />
        <ul className="divide-y divide-line">
          {visible.map((w) => (
            <li key={w.id} className="py-4">
              {editing === w.id ? (
                <BalamaForm
                  initial={w}
                  busy={busy}
                  submitLabel="Сақтау"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (next) => {
                    const ok = await run(
                      () => editBalama((items) => items.map((x) => (x.id === w.id ? { id: w.id, ...next } : x))),
                      "Өзгерістер сақталды",
                    );
                    if (ok) setEditing(null);
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span aria-hidden="true" className="text-3xl">
                    {w.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif font-bold text-heading">{w.text}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{w.definition}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className={smallBtn} onClick={() => setEditing(w.id)}>
                      Өңдеу
                    </button>
                    <button type="button" className={dangerBtn} onClick={() => setDeleting(w)}>
                      Жою
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="py-8 text-center text-muted">Ештеңе табылмады.</p>}
        {visible.length < filtered.length && (
          <div className="mt-4 text-center">
            <button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Тағы көрсету ({filtered.length - visible.length})
            </button>
          </div>
        )}
      </Panel>

      <Panel title="JSON файлдан импорттау">
        <p className="mb-3 text-sm text-muted">
          Әр жазбада <code>text</code> және <code>definition</code> міндетті, <code>icon</code> міндетті емес.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          aria-label="JSON файл"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
        />
        {rows && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-bg p-4">
            <span>{rows.length} сөз табылды.</span>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={async () => {
                const ok = await run(
                  () => editBalama((items) => [...items, ...rows.map((r) => ({ id: newBalamaId(), ...r }))]),
                  `${rows.length} сөз қосылды`,
                );
                if (ok) setRows(null);
              }}
            >
              Бар сөздерге қосу
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setReplace(true)}>
              Барлығын ауыстыру
            </button>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `«${deleting.text}» сөзін жоясыз ба?` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) run(() => editBalama((items) => items.filter((x) => x.id !== deleting.id)), "Балама сөз жойылды");
        }}
      />
      <ConfirmDialog
        open={replace}
        title={`Қазіргі ${words.length} сөз жойылып, файлдағы ${rows?.length ?? 0} сөзбен ауыстырылады. Жалғастырасыз ба?`}
        confirmLabel="Ауыстыру"
        onClose={() => setReplace(false)}
        onConfirm={async () => {
          if (!rows) return;
          if (await run(() => editBalama(() => rows.map((r) => ({ id: newBalamaId(), ...r }))), "Балама сөздер ауыстырылды")) setRows(null);
        }}
      />
    </div>
  );
}

function BalamaForm({
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Input;
  busy: boolean;
  submitLabel: string;
  onSubmit: (w: Input) => void;
  onCancel: () => void;
}) {
  const [w, setW] = useState<Input>({ text: initial.text, definition: initial.definition, icon: initial.icon });
  const set = (k: keyof Input) => (v: string) => setW((x) => ({ ...x, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = { text: w.text.trim(), definition: w.definition.trim(), icon: w.icon.trim() || "🎭" };
    if (clean.text && clean.definition) onSubmit(clean);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-gold/50 bg-bg p-4">
      <TextField label="Балама сөз" value={w.text} onChange={set("text")} required placeholder="Мысалы: Дайын асқа тік қасық" />
      <TextField label="Мағынасы" value={w.definition} onChange={set("definition")} multiline required />
      <TextField label="Белгіше (эмодзи)" value={w.icon} onChange={set("icon")} />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Болдырмау
        </button>
        <button type="submit" className="btn-primary" disabled={busy || !w.text.trim() || !w.definition.trim()}>
          {busy ? <BusyLabel>Сақталуда...</BusyLabel> : submitLabel}
        </button>
      </div>
    </form>
  );
}
