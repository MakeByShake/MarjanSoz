import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ProverbLibrary } from "./ProverbLibrary";

export const metadata: Metadata = { title: "Мақалдар" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Кітапхана" title="Мақалдар кітапханасы" subtitle="Қазақ халқының дана сөзі — мақал-мәтелдер жинағы" />
      <ProverbLibrary />
    </>
  );
}
