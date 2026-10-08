import Link from "next/link";
import type { Meal } from "@/shared/api-types";
import { th } from "@/copy/th";
import { formatRange, totals } from "@/lib/client/meal";
import { Disclaimer } from "./Disclaimer";

export function SavedView({ meals, onNext }: { meals: Meal[]; onNext: () => void }) {
  const sum = totals(meals);
  return (
    <section className="stack">
      <div role="status" className="alert alert-success">
        <h1 className="h2">{th.saved.title}</h1>
        <p>{th.saved.summary(meals[0].dish_name_th, meals.length - 1, formatRange(sum.low, sum.high))}</p>
      </div>
      <Disclaimer variant="short" />
      <button type="button" className="btn btn-primary" onClick={onNext}>
        {th.saved.next}
      </button>
      <Link className="btn btn-secondary" href="/history">
        {th.saved.history}
      </Link>
    </section>
  );
}
