'use client';

import type { ReactNode } from 'react';

/** 지도 아래에 붙는 하단 시트 (피그마 바텀시트 모양). 페이지가 화면 아래 묶음 안에 넣는다 */
export default function Sheet({ onClose, maxH = '70vh', children }: { onClose?: () => void; maxH?: string; children: ReactNode }) {
  return (
    <div
      className="pointer-events-auto relative w-full overflow-y-auto rounded-t-[20px] bg-white px-[22px] pb-4 pt-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ maxHeight: maxH }}
    >
      <div className="mx-auto mb-2 h-1 w-11 rounded-full bg-[#E9E2DA]" />
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
