"use client";

import { useEffect, useRef, useState } from "react";
import seed from "@/data/proverbs.json";
import { syncSeed } from "@/lib/admin";
import { SEED_TOPICS, SEED_VERSION } from "@/lib/topics";
import { Loading, PageHeader } from "@/components/ui";
import { useBalama } from "@/lib/balama";
import { useLibrary } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";
import { BalamaPanel } from "./BalamaPanel";
import { ImportPanel } from "./ImportPanel";
import { LessonsPanel } from "./LessonsPanel";
import { ProverbsPanel } from "./ProverbsPanel";
import { RatingPanel } from "./RatingPanel";
import { TopicsPanel } from "./TopicsPanel";
import { UsersPanel } from "./UsersPanel";

const TABS = [
  { id: "proverbs", label: "📜 Мақалдар" },
  { id: "topics", label: "🏷️ Тақырыптар" },
  { id: "lessons", label: "📚 Сабақтар" },
  { id: "balama", label: "🎭 Балама сөздер" },
  { id: "users", label: "👥 Пайдаланушылар" },
  { id: "rating", label: "🏆 Рейтинг" },
  { id: "import", label: "📥 Импорт" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function Admin() {
  const user = useCurrentUser();
  const library = useLibrary();
  const balama = useBalama();
  const [tab, setTab] = useState<Tab>("lessons");
  const [sync, setSync] = useState<"idle" | "running" | "done" | "error">("idle");
  const started = useRef(false);

  // Мақалы из data/proverbs.json сами доливаются в базу, как только админ открыл панель
  const needSync = !!user?.isAdmin && !library.loading && !library.error && library.seedVersion < SEED_VERSION;
  useEffect(() => {
    if (!needSync || started.current) return;
    started.current = true;
    const run = async () => {
      setSync("running");
      try {
        await syncSeed(
          seed.map((p) => ({ ...p, id: String(p.id) })),
          SEED_TOPICS,
          { proverbs: library.proverbs, topics: library.topics, chunks: library.chunks, version: library.version },
          SEED_VERSION,
        );
        setSync("done");
      } catch {
        started.current = false;
        setSync("error");
      }
    };
    run();
  }, [needSync, library]);

  if (!user) return <Loading />;
  if (!user.isAdmin) {
    return (
      <div className="py-16 text-center">
        <div aria-hidden="true" className="text-5xl">
          🔒
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-heading">Рұқсат жоқ</h1>
        <p className="text-muted">Бұл бет тек әкімшілерге арналған.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Әкімші панелі"
        subtitle={`${library.proverbs.length} мақал · ${library.topics.length} тақырып · ${balama.words.length} балама сөз`}
      />
      {sync !== "idle" && (
        <p
          role="status"
          className={`mb-4 rounded-xl border p-3 text-center text-sm ${
            sync === "error" ? "border-red-700/50 text-red-800 dark:text-red-200" : "border-gold/60"
          }`}
        >
          {sync === "running" && "⏳ Кітаптағы мақалдар базаға жүктелуде..."}
          {sync === "done" && `✅ Кітаптағы мақалдар базаға жүктелді. Барлығы ${library.proverbs.length} мақал.`}
          {sync === "error" && "⚠️ Мақалдарды базаға жүктеу мүмкін болмады. Firestore ережелерін және әкімші құқығын тексеріңіз."}
        </p>
      )}
      <div role="tablist" aria-label="Әкімші бөлімдері" className="mb-6 flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-5 py-2 font-medium transition ${
              tab === t.id
                ? "border-primary bg-primary text-white dark:border-gold dark:bg-gold dark:text-bg"
                : "border-line bg-card hover:border-primary dark:hover:border-gold"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {library.error ? (
          <p role="alert" className="py-16 text-center text-muted">
            Деректерді жүктеу мүмкін болмады. Бетті жаңартып көріңіз.
          </p>
        ) : library.loading ? (
          <Loading />
        ) : tab === "proverbs" ? (
          <ProverbsPanel library={library} />
        ) : tab === "topics" ? (
          <TopicsPanel library={library} />
        ) : tab === "lessons" ? (
          <LessonsPanel libs={{ proverbs: library.proverbs, topics: library.topics, balama: balama.words }} />
        ) : tab === "balama" ? (
          <BalamaPanel />
        ) : tab === "users" ? (
          <UsersPanel />
        ) : tab === "rating" ? (
          <RatingPanel />
        ) : (
          <ImportPanel library={library} />
        )}
      </div>
    </>
  );
}
