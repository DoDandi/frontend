'use client';

import type { ReactNode } from 'react';

/** 지도 아래에 붙는 하단 시트 (피그마 바텀시트 모양) */
export default function Sheet({ onClose, maxH = '70vh', children }: { onClose?: () => void; maxH?: string; children: ReactNode }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 overflow-y-auto rounded-t-[20px] bg-white px-[22px] pb-4 pt-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      style={{ maxHeight: maxH }}
    >
      <div className="mx-auto mb-2 h-1 w-11 rounded-full bg-[#E5E0DA]" />
      {onClose && (
        <button type="button" onClick={onClose} className="absolute right-3 top-2 p-2 text-xl leading-none text-gray-400" aria-label="닫기">
          ×
        </button>
      )}
      {children}
    </div>
  );
}

/** 단계 이름 칩 (서늘·따뜻·폭염·대프리카) */
export function BandChip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span className="shrink-0 rounded-xl px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  );
}
