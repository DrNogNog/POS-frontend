"use client";

import { useState } from "react";

interface ColumnDropdownProps {
  options: string[];
  selected: Set<string>;
  setSelected: (cols: Set<string>) => void;
}

export default function ColumnDropdown({ options, selected, setSelected }: ColumnDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (col: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(col)) {
      newSelected.delete(col);
    } else {
      newSelected.add(col);
    }
    setSelected(newSelected);
  };

  return (
    <div className="relative">
      <button
        className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-300"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        +
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded shadow-lg z-20">
          {options.map((col) => (
            <label
              key={col}
              className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              <span className="text-gray-800 dark:text-white">{col}</span>
              <input
                type="checkbox"
                checked={selected.has(col)}
                onChange={() => toggleColumn(col)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
