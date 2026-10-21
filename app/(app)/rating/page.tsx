import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { RatingList } from "./RatingList";

export const metadata: Metadata = { title: "Рейтинг" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Көшбасшылар" title="Рейтинг" subtitle="Ең белсенді оқушылардың тізімі" />
      <RatingList />
    </>
  );
}
