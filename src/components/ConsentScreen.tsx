"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { th } from "@/copy/th";
import { ApiError, getConsent, postConsent } from "@/lib/client/api";
import { ConsentPanel } from "./ConsentPanel";
import { useToast } from "./Toast";

export function ConsentScreen({ updated }: { updated: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(updated);

  useEffect(() => {
    getConsent().then(
      (c) => c.active && router.replace("/"),
      () => {},
    );
  }, [router]);

  async function accept() {
    setBusy(true);
    try {
      await postConsent();
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONSENT_VERSION_MISMATCH") setStale(true);
      else if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
      setBusy(false);
    }
  }

  return <ConsentPanel updated={stale} busy={busy} onAccept={accept} />;
}
