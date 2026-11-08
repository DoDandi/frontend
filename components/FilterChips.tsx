'use client';

import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/lib/constants';

type Props = { value: Category | null; onChange: (c: Category | null) => void };

export default function FilterChips({ value, onChange }: Props) {
  const items: { key: Category | null; label: string }[] = [
    { key: null, label: '전체' },
    ...CATEGORIES.map(c => ({ key: c, label: CATEGORY_LABEL[c] })),
  ];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
      {items.map(it => {
        const active = value === it.key;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange(it.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold shadow ${
              active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
