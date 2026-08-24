"use client";

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

export default function ChipSelect({ options, selected, onToggle }: ChipSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "border-brand bg-brand text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
