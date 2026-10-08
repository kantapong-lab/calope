"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Dish, Meal } from "@/shared/api-types";
import { th } from "@/copy/th";
import { ApiError, analyze, getConsent, saveMeals } from "@/lib/client/api";
import { ACCEPTED_TYPES, checkFile, resizeToJpeg, type FileProblem } from "@/lib/client/image";
import { toItem, toMealItem, type Item } from "@/lib/client/meal";
import { Disclaimer } from "./Disclaimer";
import { DishEditor } from "./DishEditor";
import { ManualForm } from "./ManualForm";
import { PhotoPreview } from "./PhotoPreview";
import { ResultView } from "./ResultView";
import { SavedView } from "./SavedView";
import { useToast } from "./Toast";

type Stage =
  | { name: "checking" }
  | { name: "idle"; rejected?: { code: FileProblem; message: string } }
  | { name: "analysing" }
  | { name: "result"; editing: number | null }
  | { name: "notFood" }
  | { name: "fallback"; retryable: boolean }
  | { name: "rateLimit"; message: string }
  | { name: "saved"; meals: Meal[] };

const accept = ACCEPTED_TYPES.join(",");

export function CaptureFlow() {
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>({ name: "checking" });
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // No photo may leave the device before consent (AC-14): gate the capture screen itself.
  useEffect(() => {
    getConsent().then(
      (consent) => {
        if (consent.active) setStage({ name: "idle" });
        else router.replace(consent.version && !consent.withdrawn_at ? "/consent?updated=1" : "/consent");
      },
      (err) => {
        if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) setStage({ name: "idle" });
      },
    );
  }, [router]);

  function dropPhoto() {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function reset() {
    abort.current?.abort();
    dropPhoto();
    setItems([]);
    setStage({ name: "idle" });
  }

  // Returns true when the error was routed to a screen; otherwise the caller shows the generic toast.
  function routeError(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    switch (err.code) {
      case "UNAUTHENTICATED":
        return true;
      case "CONSENT_REQUIRED":
        router.push("/consent");
        return true;
      case "CONSENT_VERSION_MISMATCH":
        router.push("/consent?updated=1");
        return true;
      case "INVALID_FILE_TYPE":
      case "FILE_TOO_LARGE":
        setStage({ name: "idle", rejected: { code: err.code, message: err.messageTh } });
        return true;
      case "RATE_LIMITED": {
        const message = err.retryAfter ? th.rateLimit.body(Math.ceil(err.retryAfter / 60)) : err.messageTh;
        setStage({ name: "rateLimit", message });
        return true;
      }
      case "PROVIDER_ERROR":
      case "PROVIDER_INVALID_OUTPUT":
      case "PROVIDER_TIMEOUT":
        setStage({ name: "fallback", retryable: err.retryable });
        return true;
      default:
        return false;
    }
  }

  async function run(blob: Blob) {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
    setStage({ name: "analysing" });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await analyze(blob, {}, controller.signal);
      if (!res.is_food) {
        setStage({ name: "notFood" });
        return;
      }
      setItems(res.dishes.map(toItem));
      setStage({ name: "result", editing: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!routeError(err)) {
        toast(th.genericError, "danger");
        setStage({ name: "idle" });
      }
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setStage({ name: "idle", rejected: { code: problem, message: th.rejected.body } });
      return;
    }
    try {
      await run(await resizeToJpeg(file));
    } catch {
      setStage({ name: "idle", rejected: { code: "INVALID_FILE_TYPE", message: th.rejected.body } });
    }
  }

  async function reestimate(index: number, hint: string): Promise<Dish | "not_food" | null> {
    if (!photo) return null;
    try {
      const res = await analyze(photo.blob, { dishHint: hint, dishIndex: index });
      return res.is_food && res.dishes[0] ? res.dishes[0] : "not_food";
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") toast(err.messageTh, "danger");
      else if (!routeError(err)) toast(th.genericError, "danger");
      return null;
    }
  }

  async function save() {
    setSaving(true);
    try {
      setStage({ name: "saved", meals: await saveMeals(items.map(toMealItem)) });
      dropPhoto();
      setItems([]);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    } finally {
      setSaving(false);
    }
  }

  const fileInputs = (
    <>
      <input ref={cameraInput} type="file" accept={accept} capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryInput} type="file" accept={accept} hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );

  switch (stage.name) {
    case "checking":
      return (
        <p role="status" className="muted">
          {th.loading}
        </p>
      );

    case "idle":
      return (
        <section className="stack">
          <h1 className="h1">{th.capture.title}</h1>
          {stage.rejected && (
            <div role="alert" className="alert alert-danger">
              <p>
                <strong>{stage.rejected.code === "FILE_TOO_LARGE" ? th.rejected.sizeTitle : th.rejected.typeTitle}</strong>
              </p>
              <p>{stage.rejected.message}</p>
            </div>
          )}
          <p className="muted">{th.capture.accepted}</p>
          <button type="button" className="btn btn-primary" onClick={() => cameraInput.current?.click()}>
            {th.capture.camera}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => galleryInput.current?.click()}>
            {th.capture.gallery}
          </button>
          {fileInputs}
          <p className="muted">{th.capture.privacyNote}</p>
          <Disclaimer />
          <Link className="btn btn-ghost" href="/manual">
            {th.capture.manual}
          </Link>
        </section>
      );

    case "analysing":
      return (
        <section className="stack" aria-busy="true">
          <h1 className="h1">{th.analysing.title}</h1>
          {photo && <PhotoPreview src={photo.url} alt={th.analysing.photoAlt} />}
          <p role="status" className="row">
            <span className="spinner" aria-hidden="true" />
            {th.analysing.status}
          </p>
          <div className="skeleton skeleton-block" aria-hidden="true" />
          <button type="button" className="btn btn-secondary" onClick={reset}>
            {th.analysing.cancel}
          </button>
          <Disclaimer variant="short" />
        </section>
      );

    case "result":
      if (stage.editing !== null && items[stage.editing]) {
        const index = stage.editing;
        return (
          <DishEditor
            item={items[index]}
            onReestimate={(hint) => reestimate(index, hint)}
            onApply={(next) => {
              setItems((list) => list.map((it, i) => (i === index ? next : it)));
              setStage({ name: "result", editing: null });
            }}
            onCancel={() => setStage({ name: "result", editing: null })}
          />
        );
      }
      return (
        <ResultView
          items={items}
          photoUrl={photo?.url ?? ""}
          saving={saving}
          onEdit={(i) => setStage({ name: "result", editing: i })}
          onSave={save}
          onRetake={reset}
        />
      );

    case "notFood":
      return (
        <section className="stack">
          <h1 className="h1">{th.result.title}</h1>
          {photo && <PhotoPreview src={photo.url} alt={th.result.photoCaption} />}
          <div role="status" className="alert alert-info">
            <p>
              <strong>{th.notFood.title}</strong>
            </p>
            <p>{th.notFood.body}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={reset}>
            {th.notFood.retake}
          </button>
          <Link className="btn btn-secondary" href="/manual">
            {th.notFood.manual}
          </Link>
        </section>
      );

    case "fallback":
      return (
        <section className="stack">
          <h1 className="h1">{th.fallback.title}</h1>
          <div role="alert" className="alert alert-danger">
            <p>
              <strong>{th.fallback.title}</strong>
            </p>
            <p>{th.fallback.body}</p>
          </div>
          {stage.retryable && photo && (
            <button type="button" className="btn btn-primary" onClick={() => run(photo.blob)}>
              {th.fallback.retry}
            </button>
          )}
          <h2 className="h2">{th.fallback.manualTitle}</h2>
          <ManualForm variant="fallback" onSaved={(meals) => {
              dropPhoto();
              setStage({ name: "saved", meals });
            }} />
        </section>
      );

    case "rateLimit":
      return (
        <section className="stack">
          <div role="alert" className="alert alert-warning">
            <h1 className="h2">{th.rateLimit.title}</h1>
            <p>{stage.message}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={reset}>
            {th.rateLimit.camera}
          </button>
          <Link className="btn btn-primary" href="/manual">
            {th.rateLimit.manual}
          </Link>
        </section>
      );

    case "saved":
      return <SavedView meals={stage.meals} onNext={reset} />;
  }
}
