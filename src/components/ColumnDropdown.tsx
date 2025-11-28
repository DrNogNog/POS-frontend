import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface ColumnDropdownProps {
  options: string[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}

export default function ColumnDropdown({
  options,
  selected,
  setSelected,
}: ColumnDropdownProps) {
  const [open, setOpen] = useState(false);

  const toggle = (name: string) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-300"
      >
        +
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 max-h-80 overflow-y-auto z-50">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
