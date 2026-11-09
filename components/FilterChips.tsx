'use client';

import { GROUPS, GROUP_LABEL, type Group } from '@/lib/constants';

type Props = { value: Group | null; onChange: (g: Group | null) => void };

export default function FilterChips({ value, onChange }: Props) {
  const items: { key: Group | null; label: string }[] = [
    { key: null, label: '전체' },
    ...GROUPS.map(g => ({ key: g, label: GROUP_LABEL[g] })),
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
      {items.map(it => {
        const active = value === it.key;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange(it.key)}
            className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs ${
              active ? 'bg-gray-900 font-bold text-white' : 'border border-gray-300 bg-white text-gray-800'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
