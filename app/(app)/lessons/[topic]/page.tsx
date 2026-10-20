import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { Lesson } from "./Lesson";

// Темы создаются в админке, поэтому адреса уроков не известны при сборке
async function LessonFromParams({ params }: { params: PageProps<"/lessons/[topic]">["params"] }) {
  const { topic } = await params;
  return <Lesson topic={decodeURIComponent(topic)} />;
}

export default function Page({ params }: PageProps<"/lessons/[topic]">) {
  return (
    <Suspense fallback={<Loading />}>
      <LessonFromParams params={params} />
    </Suspense>
  );
}
