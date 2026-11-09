'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORY_LABEL } from '@/lib/constants';
import { BAND_STYLE } from './HeatMarker';
import type { ZonePlace } from './ZoneLayer';

type Props = { places: ZonePlace[]; zoneName: (id: string | null) => string | null; onSelect: (id: string) => void; onClose: () => void };

/** 장소 이름 검색. 입력 전에는 지금 뜨거운 곳 5개를 보여 준다 */
export default function PlaceSearch({ places, zoneName, onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const term = q.trim().replace(/\s+/g, '').toLowerCase();
  const list = term
    ? places.filter(p => p.name.replace(/\s+/g, '').toLowerCase().includes(term)).sort((a, b) => b.temp - a.temp)
    : [...places].sort((a, b) => b.temp - a.temp).slice(0, 5);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center gap-2 px-3 pb-3 pt-[max(env(safe-area-inset-top),14px)]">
        <button type="button" onClick={onClose} className="p-2 text-2xl leading-none text-gray-700" aria-label="검색 닫기">
          ←
        </button>
        <input
          ref={input}
          id="place-search"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="장소 이름 검색"
          className="h-11 flex-1 rounded-full bg-[#F6F4F1] px-4 text-[15px] outline-none focus:ring-2 focus:ring-[#B7392D]/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-[22px]">
        <p className="pb-1 text-xs font-bold text-gray-500">{term ? `검색 결과 ${list.length}곳` : '지금 뜨거운 곳'}</p>
        {term && list.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">&lsquo;{q.trim()}&rsquo;에 맞는 장소가 없어요</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map(p => {
              const s = BAND_STYLE[p.band];
              const zone = zoneName(p.zoneId);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => onSelect(p.id)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums"
                      style={{ backgroundColor: s.color, color: s.onColor }}
                    >
                      {Math.round(p.temp)}°
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-gray-900">{p.name}</span>
                      <span className="block text-xs text-gray-500">
                        {CATEGORY_LABEL[p.category]}
                        {zone && ` · ${zone}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
