"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useCurrentUser } from "@/lib/user";
import { Loading } from "./ui";

/** Страницы приложения доступны только после входа (как в старом сайте). */
export function AuthGuard({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  if (!user) return <Loading />;
  return children;
}
