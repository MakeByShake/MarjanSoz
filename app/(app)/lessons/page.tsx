import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TopicList } from "./TopicList";

export const metadata: Metadata = { title: "Сабақтар" };

export default function Page() {
  return (
    <>
      <PageHeader title="Сабақтар" subtitle="Мақалдарды тақырыптар бойынша үйреніңіз" />
      <TopicList />
    </>
  );
}
