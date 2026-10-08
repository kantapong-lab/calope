import { th } from "@/copy/th";
import { formatRange } from "@/lib/client/meal";

// Always a range (AC-5), "N - N" when low equals high. Never a single estimate number.
export function KcalRange({ low, high }: { low: number; high: number }) {
  return (
    <span className="kcal">
      <strong className="kcal-value">{formatRange(low, high)}</strong> <span className="muted">{th.kcalUnit}</span>
    </span>
  );
}
