"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { th } from "@/copy/th";
import { ApiError, deleteAllMeals, deleteConsent, getConsent, type ConsentState } from "@/lib/client/api";
import { CONSENT_INTRO, CONSENT_ROWS, CONSENT_TITLE } from "@/shared/consent";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

export function SettingsPanel() {
  const router = useRouter();
  const toast = useToast();
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [withdrawnNow, setWithdrawnNow] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getConsent().then(setConsent, (err) => {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    });
  }, [toast]);

  async function withdraw() {
    setBusy(true);
    try {
      setConsent(await deleteConsent());
      setWithdrawnNow(true);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    setBusy(true);
    try {
      await deleteAllMeals();
      toast(th.settings.deleteAllDone);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    } finally {
      setBusy(false);
      setConfirmAll(false);
    }
  }

  return (
    <div className="stack">
      <header className="row">
        <Link className="btn btn-ghost" href="/">
          {th.back}
        </Link>
        <h1 className="h1">{th.settings.title}</h1>
      </header>

      {withdrawnNow && (
        <div role="status" className="alert alert-success">
          <p>
            <strong>{th.settings.withdrawnTitle}</strong>
          </p>
          <p>{th.settings.withdrawnBody}</p>
        </div>
      )}

      <section className="card stack" aria-labelledby="consent-heading">
        <h2 id="consent-heading" className="h2">
          {th.settings.consentHeading}
        </h2>
        {consent && consent.active && consent.consented_at && consent.version && (
          <>
            <p>
              {th.settings.consentActive(
                new Date(consent.consented_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }),
                consent.version,
              )}
            </p>
            <details>
              <summary>{th.settings.readConsent}</summary>
              <h3 className="h3">{CONSENT_TITLE}</h3>
              <p>{CONSENT_INTRO}</p>
              <dl className="consent-list">
                {CONSENT_ROWS.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.text}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={withdraw}>
              {th.settings.withdraw}
            </button>
          </>
        )}
        {consent && !consent.active && (
          <>
            <p>{consent.withdrawn_at ? th.settings.statusWithdrawn : th.settings.statusNone}</p>
            <button type="button" className="btn btn-primary" onClick={() => router.push("/consent")}>
              {th.settings.consentAgain}
            </button>
          </>
        )}
      </section>

      <section className="card stack" aria-labelledby="data-heading">
        <h2 id="data-heading" className="h2">
          {th.settings.dataHeading}
        </h2>
        <p>{th.settings.dataBody}</p>
        <Link className="btn btn-secondary" href="/history">
          {th.settings.toHistory}
        </Link>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmAll(true)}>
          {th.settings.deleteAll}
        </button>
      </section>

      <section className="card stack" aria-labelledby="account-heading">
        <h2 id="account-heading" className="h2">
          {th.settings.accountHeading}
        </h2>
        <button type="button" className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/signin" })}>
          {th.settings.signOut}
        </button>
      </section>

      <ConfirmDialog
        open={confirmAll}
        title={th.settings.deleteAllTitle}
        body={th.settings.deleteAllBody}
        confirmLabel={th.settings.deleteAllConfirm}
        busy={busy}
        onConfirm={removeAll}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
}
