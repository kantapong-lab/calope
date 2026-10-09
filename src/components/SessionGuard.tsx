"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UNAUTHENTICATED_EVENT } from "@/lib/client/api";

// Any 401 sends the user to sign-in (design.md: signed-out).
export function SessionGuard() {
  const router = useRouter();
  useEffect(() => {
    const onSignedOut = () => router.replace("/signin?signedout=1");
    window.addEventListener(UNAUTHENTICATED_EVENT, onSignedOut);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onSignedOut);
  }, [router]);
  return null;
}
