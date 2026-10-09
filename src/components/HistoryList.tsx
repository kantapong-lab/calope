"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Meal } from "@/shared/api-types";
import { th } from "@/copy/th";
import { ApiError, deleteMeal, listMeals } from "@/lib/client/api";
import { groupByDay, timeLabel } from "@/lib/client/format";
import { Disclaimer } from "./Disclaimer";
import { ConfirmDialog } from "./ConfirmDialog";
import { KcalRange } from "./KcalRange";
import { useToast } from "./Toast";

type Status = "loading" | "error" | "ready";

export function HistoryList() {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  const load = useCallback(
    () =>
      listMeals().then(
        (page) => {
          setMeals(page.items);
          setNext(page.next_before);
          setStatus("ready");
        },
        () => setStatus("error"),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (focusId) rows.current.get(focusId)?.focus();
  }, [focusId]);

  async function loadMore() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await listMeals(next);
      setMeals((list) => [...list, ...page.items]);
      setNext(page.next_before);
      if (page.items[0]) setFocusId(page.items[0].id);
    } catch {
      toast(th.genericError, "danger");
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteMeal(pendingDelete.id);
      setMeals((list) => list.filter((m) => m.id !== pendingDelete.id));
      toast(th.history.deleted);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "UNAUTHENTICATED")) toast(th.genericError, "danger");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  if (status === "loading") {
    return (
      <p role="status" className="muted">
        {th.history.loading}
      </p>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="alert alert-danger stack">
        <p>
          <strong>{th.history.errorTitle}</strong>
        </p>
        <p>{th.history.errorBody}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setStatus("loading");
            load();
          }}
        >
          {th.history.retry}
        </button>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <section className="stack">
        <h2 className="h2">{th.history.emptyTitle}</h2>
        <p>{th.history.emptyBody}</p>
        <Link className="btn btn-primary" href="/">
          {th.history.emptyCapture}
        </Link>
        <Link className="btn btn-secondary" href="/manual">
          {th.history.emptyManual}
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      {groupByDay(meals).map((group) => (
        <section key={group.label} className="stack">
          <h2 className="h3">{group.label}</h2>
          <ul className="stack list-plain">
            {group.items.map((meal) => (
              <li
                key={meal.id}
                ref={(el) => {
                  if (el) rows.current.set(meal.id, el);
                  else rows.current.delete(meal.id);
                }}
                tabIndex={-1}
                className="card stack"
              >
                <div>
                  <h3 className="h2">{meal.dish_name_th}</h3>
                  {meal.dish_name_en && <p className="muted" lang="en">{meal.dish_name_en}</p>}
                </div>
                <p>
                  <span className="muted">{timeLabel(meal.created_at)}</span> {meal.portion_grams} {th.gramUnit}{" "}
                  <KcalRange low={meal.kcal_low} high={meal.kcal_high} />
                  {meal.source === "manual" && <span className="muted"> {th.result.userEntered}</span>}
                </p>
                <div className="row between">
                  <span>
                    {meal.source === "manual" && <span className="badge">{th.result.manualBadge}</span>}
                    {meal.source === "ai" && meal.edited && <span className="badge">{th.result.editedBadge}</span>}
                  </span>
                  <button type="button" className="btn btn-ghost" aria-label={th.history.deleteLabel(meal.dish_name_th)} onClick={() => setPendingDelete(meal)}>
                    {th.history.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {next && (
        <button type="button" className="btn btn-secondary" disabled={loadingMore} onClick={loadMore}>
          {th.history.loadMore}
        </button>
      )}
      <Disclaimer />
      <ConfirmDialog
        open={pendingDelete !== null}
        title={th.history.confirmTitle}
        body={pendingDelete ? th.history.confirmBody(pendingDelete.dish_name_th, pendingDelete.portion_grams) : ""}
        confirmLabel={th.history.delete}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
