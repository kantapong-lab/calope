"use client";

import { useEffect, useId, useState } from "react";
import { th } from "@/copy/th";

type Props = {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  // Returns an error text to show under the field, or null when the value was accepted.
  onCommit: (next: number) => string | null;
};

const round = (n: number, decimals: number) => Number(n.toFixed(decimals));

export function PortionStepper({ label, value, step, min, max, decimals = 0, onCommit }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(round(value, decimals)));
    setError(null);
  }, [value, decimals]);

  const stepBy = (delta: number) => commit(round(Math.min(max, Math.max(min, value + delta)), decimals));

  function commit(raw: number) {
    setError(onCommit(raw));
  }

  function onInput(text: string) {
    setDraft(text);
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n)) setError(onCommit(Number.NaN));
    else commit(n);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        <button type="button" className="btn btn-secondary" aria-label={`${th.edit.decrease} ${label}`} onClick={() => stepBy(-step)}>
          -
        </button>
        <input
          id={id}
          className="input"
          type="text"
          inputMode="decimal"
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              stepBy(step);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              stepBy(-step);
            }
          }}
        />
        <button type="button" className="btn btn-secondary" aria-label={`${th.edit.increase} ${label}`} onClick={() => stepBy(step)}>
          +
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
