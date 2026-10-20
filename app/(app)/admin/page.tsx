import type { Metadata } from "next";
import { Admin } from "./Admin";

export const metadata: Metadata = { title: "Админ" };

export default function Page() {
  return <Admin />;
}
