"use client";

import { useState } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { useLibrary } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";
import { ImportPanel } from "./ImportPanel";
import { ProverbsPanel } from "./ProverbsPanel";
import { TopicsPanel } from "./TopicsPanel";

const TABS = [
  { id: "proverbs", label: "📜 Мақалдар" },
  { id: "topics", label: "📚 Сабақтар" },
  { id: "import", label: "📥 Импорт" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function Admin() {
  const user = useCurrentUser();
  const library = useLibrary();
  const [tab, setTab] = useState<Tab>("proverbs");

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
        subtitle={`${library.proverbs.length} мақал · ${library.topics.length} сабақ`}
      />
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
        ) : (
          <ImportPanel library={library} />
        )}
      </div>
    </>
  );
}
