import { th } from "@/copy/th";
import { confidenceLevel, type Item } from "@/lib/client/meal";
import { KcalRange } from "./KcalRange";

type Props = { item: Item; onEdit: () => void };

export function DishCard({ item, onEdit }: Props) {
  const level = confidenceLevel(item.confidence);
  return (
    <li className="card stack">
      <div>
        <h2 className="h2">{item.name_th}</h2>
        {item.name_en && <p className="muted" lang="en">{item.name_en}</p>}
      </div>
      <div className="row">
        <span className={`badge badge-${level}`}>
          {th.result.confidence(th.result.levels[level], Math.round(item.confidence * 100))}
        </span>
        {item.edited && <span className="badge">{th.result.editedBadge}</span>}
      </div>
      <p>
        <span className="muted">{th.result.estimate}</span> {item.grams} {th.gramUnit} <KcalRange low={item.kcal_low} high={item.kcal_high} />
      </p>
      {item.assumptions.length > 0 && (
        <div>
          <h3 className="h3">{th.result.assumptions}</h3>
          <ul className="list">
            {item.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="btn btn-secondary" onClick={onEdit}>
        {th.result.editDish}
        <span className="sr-only"> {item.name_th}</span>
      </button>
    </li>
  );
}
