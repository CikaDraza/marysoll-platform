import type { EducationTaxonomy } from "@/lib/education/taxonomy";
import type { EducationEditorState } from "./education-content-editor-model";

function ChoiceCards<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly { key: T; label: string; help?: string }[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-900 dark:text-white">
        {label}
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <label
              key={option.key}
              className={`flex min-h-28 cursor-pointer gap-3 rounded-xl border p-4 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-violet-600 ${
                selected
                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:bg-violet-950/30"
                  : "border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.key}
                checked={selected}
                onChange={() => onChange(option.key)}
                className="mt-1 size-4 accent-violet-600"
              />
              <span>
                <span className="block font-semibold text-gray-900 dark:text-white">
                  {option.label}
                </span>
                {option.help && (
                  <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {option.help}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function EducationTaxonomyPicker({
  taxonomy,
  topicKey,
  intentKey,
  onTopicChange,
  onIntentChange,
}: {
  taxonomy: EducationTaxonomy;
  topicKey?: EducationEditorState["topicKey"];
  intentKey?: EducationEditorState["intentKey"];
  onTopicChange: (value: NonNullable<EducationEditorState["topicKey"]>) => void;
  onIntentChange: (value: NonNullable<EducationEditorState["intentKey"]>) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChoiceCards
        name="education-topic"
        label="Tema"
        options={taxonomy.topics}
        value={topicKey}
        onChange={onTopicChange}
      />
      <ChoiceCards
        name="education-intent"
        label="Šta čitalac dobija"
        options={taxonomy.intents}
        value={intentKey}
        onChange={onIntentChange}
      />
    </div>
  );
}
