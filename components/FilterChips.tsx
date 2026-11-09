'use client';

import { GROUPS, GROUP_LABEL, type Group } from '@/lib/constants';

type Props = { value: Group | null; onChange: (g: Group | null) => void };

export default function FilterChips({ value, onChange }: Props) {
  const items: { key: Group | null; label: string }[] = [
    { key: null, label: '전체' },
    ...GROUPS.map(g => ({ key: g, label: GROUP_LABEL[g] })),
  ];
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {items.map(it => {
        const active = value === it.key;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange(it.key)}
            className={`h-[34px] min-w-[58px] shrink-0 rounded-full px-3.5 text-[13px] ${
              active ? 'bg-[#B7392D] font-bold text-white' : 'border border-[#E5E0DA] bg-white text-gray-800'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
