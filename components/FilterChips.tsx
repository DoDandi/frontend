'use client';

import { GROUPS, GROUP_LABEL, type Group } from '@/lib/constants';

type Props = { value: Group | null; onChange: (g: Group | null) => void };

export default function FilterChips({ value, onChange }: Props) {
  const items: { key: Group | null; label: string }[] = [
    { key: null, label: '전체' },
    ...GROUPS.map(g => ({ key: g, label: GROUP_LABEL[g] })),
  ];
  return (
    <div className="flex h-9 items-center justify-center gap-2 overflow-x-auto [scrollbar-width:none]">
      {items.map(it => {
        const active = value === it.key;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange(it.key)}
            className={`h-[34px] shrink-0 rounded-[17px] border text-xs leading-[17px] ${it.label.length > 2 ? 'w-[74px]' : 'w-[58px]'} ${
              active ? 'border-[#B7392D] bg-[#B7392D] font-bold text-white' : 'border-[#E9E2DA] bg-white font-medium text-[#282522]'
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
