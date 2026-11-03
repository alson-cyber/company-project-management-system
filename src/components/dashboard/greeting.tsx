"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  // Re-check every few minutes so a page left open over noon updates its greeting.
  const timer = window.setInterval(onChange, 5 * 60 * 1000);
  return () => window.clearInterval(timer);
}

function hourNow(): number {
  return new Date().getHours();
}

/** "Good morning, Alson" using the viewer's own clock. The server renders a neutral greeting first. */
export function Greeting({ firstName }: { firstName: string }) {
  const hour = useSyncExternalStore(subscribe, hourNow, () => null);
  const part =
    hour === null
      ? "Welcome back"
      : hour < 5
        ? "Working late"
        : hour < 12
          ? "Good morning"
          : hour < 17
            ? "Good afternoon"
            : "Good evening";
  return (
    <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">
      {part}, {firstName}
    </h1>
  );
}
