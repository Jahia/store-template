import type { ChangeEvent } from "react";
import styles from "./editor.module.css";

export interface CategoryOption {
  uuid: string;
  name: string;
}

export interface CategorySelectLabels {
  /** Placeholder option for the "add" dropdown. */
  placeholder: string;
  /** Prefix for a chip's remove-button accessible name. */
  remove: string;
}

interface CategorySelectProps {
  id: string;
  options: CategoryOption[];
  selected: string[];
  ariaLabel: string;
  labels: CategorySelectLabels;
  onToggle: (uuid: string) => void;
}

/**
 * Category picker styled like the tag editor (chips), but constrained to the store's
 * fixed category tree rather than free text: the selected categories show as removable
 * chips and a dropdown adds from the not-yet-selected options. A category is either
 * selected or not, so the single `onToggle` serves both add (pick an option) and remove
 * (chip ×). The add `<select>` is controlled at `value=""` so it always rests on the
 * placeholder; picking an option fires onToggle and the list re-renders without it.
 */
export default function CategorySelect({
  id,
  options,
  selected,
  ariaLabel,
  labels,
  onToggle,
}: Readonly<CategorySelectProps>) {
  const nameOf = new Map(options.map((o) => [o.uuid, o.name]));
  const available = options.filter((o) => !selected.includes(o.uuid));

  const onPick = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) onToggle(e.target.value);
  };

  return (
    <div className={styles.tagInput} data-category-select="">
      <ul className={styles.tagChips}>
        {selected.map((uuid) => {
          const name = nameOf.get(uuid) ?? uuid;
          return (
            <li key={uuid} className={styles.tagChip}>
              <span>{name}</span>
              <button
                type="button"
                className={styles.tagRemove}
                aria-label={`${labels.remove}: ${name}`}
                onClick={() => onToggle(uuid)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {available.length > 0 && (
        <select
          id={id}
          className={styles.tagPicker}
          aria-label={ariaLabel}
          value=""
          onChange={onPick}
        >
          <option value="" disabled>
            {labels.placeholder}
          </option>
          {available.map((o) => (
            <option key={o.uuid} value={o.uuid}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
