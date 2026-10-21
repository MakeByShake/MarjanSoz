import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { BalamaList } from "./BalamaList";

export const metadata: Metadata = { title: "Балама сөздер" };

export default function Page() {
  return (
    <>
      <PageHeader title="🎭 Балама сөздер" subtitle="Қазақ тіліндегі түсіндірмелі сөз тіркестерінің бай әлемі" />
      <BalamaList />
    </>
  );
}
