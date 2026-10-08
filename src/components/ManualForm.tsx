"use client";

import { useId, useState } from "react";
import type { Meal } from "@/shared/api-types";
import { th } from "@/copy/th";
import { ApiError, saveMeals } from "@/lib/client/api";
import { GRAMS_MAX, GRAMS_MIN, KCAL_MAX, isIntInRange } from "@/lib/client/meal";
import { Disclaimer } from "./Disclaimer";
import { useToast } from "./Toast";

type Props = { variant?: "page" | "fallback"; onSaved: (meals: Meal[]) => void };

export function ManualForm({ variant = "page", onSaved }: Props) {
  const id = useId();
  const toast = useToast();
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const nameOk = name.trim().length >= 1 && name.trim().length <= 120;
  const gramsOk = isIntInRange(Number(grams), GRAMS_MIN, GRAMS_MAX) && grams.trim() !== "";
  const kcalOk = isIntInRange(Number(kcal), 0, KCAL_MAX) && kcal.trim() !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!nameOk || !gramsOk || !kcalOk) return;
    setBusy(true);
    try {
      const meals = await saveMeals([
        {
          dish_name_th: name.trim(),
          dish_name_en: null,
          portion_grams: Number(grams),
          kcal_low: Number(kcal),
          kcal_high: Number(kcal),
          edited: false,
          source: "manual",
        },
      ]);
      onSaved(meals);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>{th.manual.name}</label>
        <input id={`${id}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={submitted && !nameOk ? true : undefined} />
        {submitted && !nameOk && <p className="field-error">{th.edit.nameError}</p>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-grams`}>{th.manual.grams}</label>
        <input id={`${id}-grams`} className="input" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} aria-invalid={submitted && !gramsOk ? true : undefined} />
        {submitted && !gramsOk && <p className="field-error">{th.edit.gramsError}</p>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-kcal`}>{variant === "page" ? th.manual.kcal : th.manual.kcalFallback}</label>
        <input id={`${id}-kcal`} className="input" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} aria-invalid={submitted && !kcalOk ? true : undefined} aria-describedby={`${id}-kcal-hint`} />
        <p id={`${id}-kcal-hint`} className={submitted && !kcalOk ? "field-error" : "muted"}>
          {th.manual.kcalHint}
        </p>
      </div>
      <Disclaimer variant={variant === "page" ? "manual" : "manualFallback"} />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {th.manual.save}
      </button>
    </form>
  );
}
