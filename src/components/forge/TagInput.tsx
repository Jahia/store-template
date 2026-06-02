import { useState, type KeyboardEvent } from "react";
import styles from "./editor.module.css";

export interface TagInputLabels {
  add: string;
  remove: string;
  placeholder: string;
}

interface TagInputProps {
  id: string;
  tags: string[];
  ariaLabel: string;
  labels: TagInputLabels;
  onChange: (tags: string[]) => void;
}

/**
 * Free-text tag editor (chips) for the module's `j:tagList` (a multi-valued
 * string property - no tag-node creation needed). Enter or comma commits the
 * typed text; Backspace on an empty input removes the last chip. Duplicates and
 * blanks are ignored.
 */
export default function TagInput({ id, tags, ariaLabel, labels, onChange }: Readonly<TagInputProps>) {
  const [text, setText] = useState("");

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) {
      setText("");
      return;
    }
    onChange([...tags, value]);
    setText("");
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(text);
    } else if (e.key === "Backspace" && text === "" && tags.length > 0) {
      const last = tags.at(-1);
      if (last !== undefined) removeTag(last);
    }
  };

  return (
    <div className={styles.tagInput}>
      <ul className={styles.tagChips}>
        {tags.map((tag) => (
          <li key={tag} className={styles.tagChip}>
            <span>{tag}</span>
            <button
              type="button"
              className={styles.tagRemove}
              aria-label={`${labels.remove}: ${tag}`}
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        id={id}
        className={styles.tagField}
        value={text}
        placeholder={labels.placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(text)}
      />
    </div>
  );
}
