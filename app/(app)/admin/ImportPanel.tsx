"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import seed from "@/data/proverbs.json";
import { parseImport, prepareImport, replaceAllProverbs, type ImportRow } from "@/lib/admin";
import { SEED_TOPICS } from "@/lib/topics";
import { Panel, StatusLine, useAction, type LibraryState } from "./shared";

const EXAMPLE = `[
  {
    "text": "Еңбек етсең, ерінбей, тояды қарның тіленбей",
    "explanation": "Адал еңбек адамды асырайды",
    "translation_ru": "Будешь трудиться — будешь сыт",
    "topic": "ena"
  }
]`;

export function ImportPanel({ library }: { library: LibraryState }) {
  const { proverbs, topics, chunks, version } = library;
  const { busy, status, run, setStatus } = useAction();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [confirmReplace, setConfirmReplace] = useState(false);

  async function onFile(file: File | undefined) {
    setRows(null);
    setStatus(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseImport(JSON.parse(await file.text()));
      if ("error" in parsed) setStatus({ kind: "error", text: parsed.error });
      else setRows(parsed.rows);
    } catch {
      setStatus({ kind: "error", text: "Файлды оқу мүмкін болмады: JSON дұрыс емес" });
    }
  }

  async function doImport() {
    if (!rows) return;
    const next = prepareImport(rows, proverbs, topics, mode);
    const ok = await run(
      () => replaceAllProverbs(next.proverbs, next.topics, chunks, version),
      `${rows.length} мақал жүктелді${next.newTopics ? `, ${next.newTopics} жаңа тақырып құрылды` : ""}`,
    );
    if (ok) setRows(null);
  }

  return (
    <div className="space-y-6">
      {proverbs.length === 0 && (
        <Panel title="Бастапқы деректер">
          <p className="mb-4 text-muted">
            База әзірге бос. Сайттағы 20 мақал мен {SEED_TOPICS.length} тақырыпты бір басумен жүктеуге болады.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  replaceAllProverbs(
                    seed.map((p) => ({ ...p, id: String(p.id) })),
                    SEED_TOPICS,
                    chunks,
                    version,
                  ),
                "Бастапқы деректер жүктелді",
              )
            }
          >
            {busy ? "Жүктелуде..." : "Бастапқы деректерді жүктеу"}
          </button>
        </Panel>
      )}

      <Panel title="JSON файлдан импорттау">
        <p className="mb-3 text-sm text-muted">
          Көп мақалды бірден қосу үшін. Әр мақалда <code>text</code>, <code>explanation</code>, <code>topic</code> міндетті,{" "}
          <code>translation_ru</code> міндетті емес. Жоқ тақырыптар (topic) өздігінен құрылады, кейін оларды «Тақырыптар» бөлімінде
          өңдей аласыз.
        </p>
        <details className="mb-4 text-sm">
          <summary className="cursor-pointer font-medium text-primary dark:text-gold">Файл үлгісі</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-3 text-xs">{EXAMPLE}</pre>
        </details>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">JSON файл</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
          />
        </label>

        {rows && (
          <div className="mt-4 space-y-4 rounded-xl border border-gold/50 bg-bg p-4">
            <p>
              <strong>{fileName}</strong>: {rows.length} мақал табылды.
            </p>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Қалай жүктеу керек?</legend>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === "append"} onChange={() => setMode("append")} className="mt-1" />
                <span>
                  Бар мақалдарға <strong>қосу</strong> (қазір {proverbs.length})
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
                <span>
                  Барлығын <strong>ауыстыру</strong>: қазіргі мақалдар жойылады
                </span>
              </label>
            </fieldset>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => (mode === "replace" ? setConfirmReplace(true) : doImport())}
            >
              {busy ? "Жүктелуде..." : "Импорттау"}
            </button>
          </div>
        )}
        <div className="mt-3">
          <StatusLine status={status} />
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmReplace}
        title={`Қазіргі ${proverbs.length} мақал жойылып, файлдағы ${rows?.length ?? 0} мақалмен ауыстырылады. Жалғастырасыз ба?`}
        confirmLabel="Ауыстыру"
        onClose={() => setConfirmReplace(false)}
        onConfirm={doImport}
      />
    </div>
  );
}
