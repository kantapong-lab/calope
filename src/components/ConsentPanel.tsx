"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { th } from "@/copy/th";
import { CONSENT_INTRO, CONSENT_ROWS, CONSENT_STATEMENT, CONSENT_TITLE, CONSENT_VERSION } from "@/shared/consent";

type Props = { updated?: boolean; busy?: boolean; onAccept: () => void };

export function ConsentPanel({ updated, busy, onAccept }: Props) {
  const id = useId();
  const [ticked, setTicked] = useState(false);

  return (
    <section className="stack" aria-labelledby={`${id}-title`}>
      {updated && (
        <div role="status" className="alert alert-info">
          {th.consent.updated}
        </div>
      )}
      <h1 id={`${id}-title`} className="h1">
        {CONSENT_TITLE}
      </h1>
      <p>{CONSENT_INTRO}</p>
      <dl className="card consent-list">
        {CONSENT_ROWS.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.text}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">{th.consent.versionLine(CONSENT_VERSION)}</p>
      <label className="check">
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />
        <span>{CONSENT_STATEMENT}</span>
      </label>
      <button type="button" className="btn btn-primary" disabled={!ticked || busy} aria-describedby={`${id}-hint`} onClick={onAccept}>
        {th.consent.button}
      </button>
      {!ticked && (
        <p id={`${id}-hint`} className="muted">
          {th.consent.buttonHint}
        </p>
      )}
      <Link className="btn btn-ghost" href="/manual">
        {th.consent.decline}
      </Link>
      <p className="muted">{th.consent.declineHint}</p>
    </section>
  );
}
