import styles from "./editor.module.css";
import TagInput, { type TagInputLabels } from "./TagInput";
import CategorySelect, { type CategoryOption } from "./CategorySelect";

export type { CategoryOption };

export interface MetadataLabels {
  status: string;
  category: string;
  noCategories: string;
  /** Placeholder for the category "add" dropdown. */
  categoryAdd: string;
  /** Prefix for a category chip's remove-button accessible name. */
  categoryRemove: string;
  tags: string;
  tag: TagInputLabels;
}

interface MetadataFieldsProps {
  statusValue: string;
  statusOptions: string[];
  onStatusChange: (value: string) => void;
  categoryOptions: CategoryOption[];
  selectedCategories: string[];
  onCategoryToggle: (uuid: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  labels: MetadataLabels;
}

/** Title-case a lowercase choicelist value ("supported" → "Supported"). */
const titleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/**
 * Metadata controls for the General tab: the module's status (choicelist),
 * categories (multi-select against the site's category tree) and free-text tags.
 * All three were previously not editable in-site. Controlled - ModuleEditor owns
 * the state and persists changes.
 */
export default function MetadataFields({
  statusValue,
  statusOptions,
  onStatusChange,
  categoryOptions,
  selectedCategories,
  onCategoryToggle,
  tags,
  onTagsChange,
  labels,
}: Readonly<MetadataFieldsProps>) {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="edit-status">{labels.status}</label>
        <select
          id="edit-status"
          className={styles.select}
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {titleCase(option)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="edit-category">
          {labels.category}
        </label>
        {categoryOptions.length === 0 ? (
          <p className={styles.muted}>{labels.noCategories}</p>
        ) : (
          <CategorySelect
            id="edit-category"
            options={categoryOptions}
            selected={selectedCategories}
            ariaLabel={labels.category}
            labels={{ placeholder: labels.categoryAdd, remove: labels.categoryRemove }}
            onToggle={onCategoryToggle}
          />
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-tags">{labels.tags}</label>
        <TagInput
          id="edit-tags"
          tags={tags}
          ariaLabel={labels.tags}
          labels={labels.tag}
          onChange={onTagsChange}
        />
      </div>
    </>
  );
}
