import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { buttonClasses } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">That address is not available in Workhub.</p>
        <Link href="/" className={buttonClasses({ variant: "secondary" }) + " mt-6"}>
          Go to Workhub
        </Link>
      </div>
    </div>
  );
}
