import type { Metadata } from "next";
import proverbs from "@/data/proverbs.json";
import { getTopicMeta } from "@/lib/topics";
import { Lesson } from "./Lesson";

export function generateStaticParams() {
  return [...new Set(proverbs.map((p) => p.topic))].map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: PageProps<"/lessons/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  return { title: getTopicMeta(decodeURIComponent(topic)).title };
}

export default async function Page({ params }: PageProps<"/lessons/[topic]">) {
  const { topic } = await params;
  return <Lesson topic={decodeURIComponent(topic)} />;
}
