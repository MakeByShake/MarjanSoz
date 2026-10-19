import type { Metadata } from "next";
import { OrnamentBand } from "@/components/Ornament";
import { AuthForms } from "./AuthForms";

export const metadata: Metadata = { title: "Кіру" };

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <OrnamentBand />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <AuthForms />
      </main>
      <OrnamentBand />
    </div>
  );
}
