import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This page does not exist, or you do not have access to it.
      </p>
      <Link href="/" className={buttonClasses({ variant: "secondary" }) + " mt-6"}>
        Back to dashboard
      </Link>
    </div>
  );
}
