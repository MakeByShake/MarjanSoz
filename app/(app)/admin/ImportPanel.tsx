"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { parseImport, prepareImport, replaceAllProverbs, type ImportRow } from "@/lib/admin";
import { normalize } from "@/lib/proverbs";
import { loadSeedRows } from "@/lib/seed";
import { SEED_TOPICS } from "@/lib/topics";
import { Panel, StatusLine, useAction, type LibraryState } from "./shared";
import { BusyLabel } from "@/components/ui";

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

  const [seedRows, setSeedRows] = useState<ImportRow[]>([]);
  useEffect(() => {
    loadSeedRows().then(setSeedRows, () => {});
  }, []);
  const known = new Set(proverbs.map((p) => normalize(p.text)));
  const missing = seedRows.filter((r) => !known.has(normalize(r.text))).length;

  async function loadSeed() {
    const next = prepareImport(seedRows, proverbs, topics, "append", SEED_TOPICS);
    await run(
      () => replaceAllProverbs(next.proverbs, next.topics, chunks, version),
      `${next.added} мақал қосылды${next.newTopics ? `, ${next.newTopics} жаңа тақырып құрылды` : ""}`,
    );
  }

  function exportBackup() {
    const data = proverbs.map(({ id, text, translation_ru, topic, explanation }) => ({ id, text, translation_ru, topic, explanation }));
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marjansoz-maqaldar-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport() {
    if (!rows) return;
    const next = prepareImport(rows, proverbs, topics, mode, SEED_TOPICS);
    const ok = await run(
      () => replaceAllProverbs(next.proverbs, next.topics, chunks, version),
      `${next.added} мақал жүктелді${rows.length > next.added ? ` (${rows.length - next.added} қайталанғаны өткізілді)` : ""}${next.newTopics ? `, ${next.newTopics} жаңа тақырып құрылды` : ""}`,
    );
    if (ok) setRows(null);
  }

  return (
    <div className="space-y-6">
      <Panel title="Кітаптағы мақалдар">
        <p className="mb-2 text-muted">
          «Мақал – сөздің маржаны» (С. Қалиев, 2022) кітабының {seedRows.length} мақалы {SEED_TOPICS.length} тақырыпқа бөлінген.
          Базада жоқтары ғана қосылады, бар мақалдар мен олардың түсіндірмелері өзгермейді.
        </p>
        <p className="mb-4 text-sm">
          {seedRows.length === 0 ? <BusyLabel>Жүктелуде...</BusyLabel> : missing === 0 ? "✅ Барлығы базада бар." : <>Базада жоқ: <strong>{missing}</strong> мақал.</>}
        </p>
        <button type="button" className="btn-primary" disabled={busy || seedRows.length === 0 || missing === 0} onClick={loadSeed}>
          {busy ? <BusyLabel>Жүктелуде...</BusyLabel> : `${missing} мақалды базаға қосу`}
        </button>
      </Panel>

      <Panel title="Сақтық көшірме">
        <p className="mb-4 text-sm text-muted">
          Базадағы барлық мақалдар мен тақырыптарды JSON файлға жүктеп алыңыз. Бұл файлды кейін «JSON файлдан импорттау»
          арқылы қайта жүктеуге болады. Код репозиторийінде де толық көшірме сақтаулы: data/proverbs.json.
        </p>
        <button type="button" className="btn-secondary" disabled={proverbs.length === 0} onClick={exportBackup}>
          ⬇️ Көшірмені жүктеп алу ({proverbs.length} мақал)
        </button>
      </Panel>

      <Panel title="JSON файлдан импорттау">
        <p className="mb-3 text-sm text-muted">
          Көп мақалды бірден қосу үшін. Әр мақалда <code>text</code> пен <code>topic</code> міндетті, <code>explanation</code> және{" "}
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
              {busy ? <BusyLabel>Жүктелуде...</BusyLabel> : "Импорттау"}
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
