import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { LessonView } from "./LessonView";

// Уроки создаются в админке, поэтому адреса не известны при сборке
async function LessonFromParams({ params }: { params: PageProps<"/lessons/[id]">["params"] }) {
  const { id } = await params;
  return <LessonView id={decodeURIComponent(id)} />;
}

export default function Page({ params }: PageProps<"/lessons/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <LessonFromParams params={params} />
    </Suspense>
  );
}
