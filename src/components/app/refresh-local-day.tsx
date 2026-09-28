"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localDate } from "@/lib/workout/periods";

/** Uma aplicação deixada aberta no domingo também deve mostrar a segunda. */
export function RefreshLocalDay({ day, timezone }: { day: string; timezone: string }) {
  const router = useRouter();
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible" && localDate(new Date(), timezone) !== day) router.refresh();
    };
    check();
    const interval = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, [day, timezone, router]);
  return null;
}
