import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { LessonList } from "./LessonList";

export const metadata: Metadata = { title: "Сабақтар" };

export default function Page() {
  return (
    <>
      <PageHeader title="Сабақтар" subtitle="Мақалдарды оқып, тапсырмаларды орындаңыз" />
      <LessonList />
    </>
  );
}
