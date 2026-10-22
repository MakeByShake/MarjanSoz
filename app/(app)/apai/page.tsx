import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ApaiChat } from "./ApaiChat";

export const metadata: Metadata = { title: "Маржан апай" };

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="ИИ көмекші"
        title="Маржан апай"
        subtitle="Жағдайыңа сай мақал табады, түсініксіз сөзді түсіндіреді, қателеріңді бірге талдайды"
      />
      <ApaiChat />
    </>
  );
}
