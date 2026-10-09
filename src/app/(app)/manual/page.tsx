"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Meal } from "@/shared/api-types";
import { ManualForm } from "@/components/ManualForm";
import { SavedView } from "@/components/SavedView";
import { th } from "@/copy/th";

export default function ManualPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<Meal[] | null>(null);

  return (
    <main className="page stack">
      {saved ? (
        <SavedView meals={saved} onNext={() => router.push("/")} />
      ) : (
        <>
          <header className="row">
            <Link className="btn btn-ghost" href="/">
              {th.back}
            </Link>
            <h1 className="h1">{th.manual.title}</h1>
          </header>
          <p className="muted">{th.manual.note}</p>
          <ManualForm onSaved={setSaved} />
        </>
      )}
    </main>
  );
}
