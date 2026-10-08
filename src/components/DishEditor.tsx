"use client";

import { useId, useState } from "react";
import type { Dish } from "@/shared/api-types";
import { th } from "@/copy/th";
import {
  GRAMS_MAX,
  GRAMS_MIN,
  KCAL_MAX,
  isIntInRange,
  withGrams,
  withManualKcal,
  withRename,
  withReestimate,
  type Item,
} from "@/lib/client/meal";
import { Disclaimer } from "./Disclaimer";
import { KcalRange } from "./KcalRange";
import { PortionStepper } from "./PortionStepper";

type Props = {
  item: Item;
  // Resolves with the replacement dish, "not_food", or null when the request failed (caller already told the user).
  onReestimate: (hint: string) => Promise<Dish | "not_food" | null>;
  onApply: (item: Item) => void;
  onCancel: () => void;
};

const HINT_MAX = 80;
const NAME_MAX = 120;

export function DishEditor({ item, onReestimate, onApply, onCancel }: Props) {
  const nameId = useId();
  const kcalId = useId();
  const [draft, setDraft] = useState(item);
  const [name, setName] = useState(item.name_th);
  const [manualKcal, setManualKcal] = useState<string | null>(null);
  const [kcalError, setKcalError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFood, setNotFood] = useState(false);

  const trimmed = name.trim();
  const renamed = trimmed !== draft.name_th;
  const nameInvalid = trimmed.length < 1 || trimmed.length > NAME_MAX;
  const hintInvalid = trimmed.length < 1 || trimmed.length > HINT_MAX;

  const commitGrams = (grams: number) => {
    if (!isIntInRange(grams, GRAMS_MIN, GRAMS_MAX)) return th.edit.gramsError;
    setDraft((d) => withGrams(d, grams));
    return null;
  };
  const commitServings = (servings: number) => commitGrams(Math.round(servings * draft.base.grams));

  async function reestimate() {
    setBusy(true);
    setNotFood(false);
    const result = await onReestimate(trimmed);
    setBusy(false);
    if (result === "not_food") setNotFood(true);
    else if (result) {
      setDraft(withReestimate(result));
      setName(result.name_th);
      setManualKcal(null);
    }
  }

  function onKcalInput(text: string) {
    setManualKcal(text);
    const n = Number(text);
    const ok = text.trim() !== "" && isIntInRange(n, 0, KCAL_MAX);
    setKcalError(!ok);
    if (ok) setDraft((d) => withManualKcal(d, n));
  }

  return (
    <section className="stack" aria-labelledby="edit-title">
      <header className="row between">
        <h1 id="edit-title" className="h1">
          {th.edit.title}
        </h1>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {th.edit.cancel}
        </button>
      </header>

      <div className="field">
        <label htmlFor={nameId}>{th.edit.name}</label>
        <input id={nameId} className="input" value={name} onChange={(e) => setName(e.target.value)} aria-describedby={`${nameId}-hint`} />
        <p id={`${nameId}-hint`} className="muted">
          {th.edit.nameHint}
        </p>
        {nameInvalid && <p className="field-error">{th.edit.nameError}</p>}
      </div>

      {renamed && (
        <div role="status" className="alert alert-info">
          <p>
            <strong>{th.edit.renamedTitle}</strong>
          </p>
          <p>{th.edit.renamedBody}</p>
          {hintInvalid && trimmed.length > HINT_MAX && <p className="field-error">{th.edit.hintError}</p>}
        </div>
      )}

      <div className="row">
        <button type="button" className="btn btn-secondary" disabled={busy || hintInvalid} onClick={reestimate}>
          {busy ? th.edit.reestimating : th.edit.reestimate}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setManualKcal(manualKcal === null ? "" : null)}>
          {th.edit.manualKcal}
        </button>
      </div>
      {notFood && (
        <p role="status" className="alert alert-info">
          {th.notFood.title}
        </p>
      )}

      {manualKcal !== null && (
        <div className="field">
          <label htmlFor={kcalId}>{th.edit.manualKcalLabel}</label>
          <input
            id={kcalId}
            className="input"
            inputMode="numeric"
            value={manualKcal}
            aria-invalid={kcalError ? true : undefined}
            onChange={(e) => onKcalInput(e.target.value)}
          />
          {kcalError && <p className="field-error">{th.edit.kcalError}</p>}
        </div>
      )}

      <PortionStepper label={`${th.edit.portion} (${th.gramUnit})`} value={draft.grams} step={25} min={GRAMS_MIN} max={GRAMS_MAX} onCommit={commitGrams} />
      <PortionStepper
        label={th.edit.servings}
        value={draft.grams / draft.base.grams}
        step={0.5}
        min={GRAMS_MIN / draft.base.grams}
        max={GRAMS_MAX / draft.base.grams}
        decimals={2}
        onCommit={commitServings}
      />

      <div className="card" aria-live="polite">
        <p className="muted">{th.edit.adjusted}</p>
        <p>
          <KcalRange low={draft.kcal_low} high={draft.kcal_high} />
        </p>
        {(draft.edited || renamed) && <span className="badge">{th.result.editedBadge}</span>}
      </div>

      <Disclaimer variant="short" />

      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || nameInvalid || kcalError}
        onClick={() => onApply(renamed ? withRename(draft, trimmed) : draft)}
      >
        {th.edit.apply}
      </button>
    </section>
  );
}
