import { th } from "@/copy/th";
import { totals, type Item } from "@/lib/client/meal";
import { Disclaimer } from "./Disclaimer";
import { DishCard } from "./DishCard";
import { KcalRange } from "./KcalRange";
import { PhotoPreview } from "./PhotoPreview";

type Props = {
  items: Item[];
  photo: Blob;
  saving: boolean;
  onEdit: (index: number) => void;
  onSave: () => void;
  onRetake: () => void;
};

export function ResultView({ items, photo, saving, onEdit, onSave, onRetake }: Props) {
  const sum = totals(items);
  return (
    <section className="stack">
      <header className="row between">
        <h1 className="h1">{th.result.title}</h1>
        <button type="button" className="btn btn-ghost" onClick={onRetake}>
          {th.result.retake}
        </button>
      </header>
      <figure className="stack">
        <PhotoPreview blob={photo} alt={th.result.photoCaption} />
        <figcaption className="muted">{th.result.photoCaption}</figcaption>
      </figure>
      <div className="card stack" aria-live="polite">
        <p className="muted">{th.result.totalLabel}</p>
        <p className="total">
          <KcalRange low={sum.low} high={sum.high} />
        </p>
        <p className="muted">{th.result.totalNote}</p>
      </div>
      <ul className="stack list-plain">
        {items.map((item, i) => (
          <DishCard key={`${i}-${item.name_th}`} item={item} onEdit={() => onEdit(i)} />
        ))}
      </ul>
      <Disclaimer />
      <button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>
        {th.result.save}
      </button>
    </section>
  );
}
