import { th } from "@/copy/th";

type Variant = "full" | "short" | "manual" | "manualFallback";

export function Disclaimer({ variant = "full" }: { variant?: Variant }) {
  return (
    <aside className="alert alert-warning" aria-label={th.disclaimer.title}>
      {variant === "full" ? (
        <p>
          <strong>{th.disclaimer.title}</strong> {th.disclaimer.body}
        </p>
      ) : (
        <p>{th.disclaimer[variant]}</p>
      )}
    </aside>
  );
}
