'use client';

import { CaretUp, X } from '@phosphor-icons/react/dist/ssr';
import { useRef, type ReactNode } from 'react';
import SheetGrip from './SheetGrip';

/** 지도 아래에 붙는 하단 시트 (피그마 바텀시트 모양). 페이지가 화면 아래 묶음 안에 넣는다 */
export default function Sheet({
  onClose,
  onCollapse,
  maxH = '70vh',
  children,
}: {
  onClose?: () => void;
  /** 있으면 손잡이를 눌러 시트를 접는다 */
  onCollapse?: () => void;
  maxH?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="sheet-in pointer-events-auto relative w-full overflow-y-auto rounded-t-[20px] bg-white px-[22px] pb-4 pt-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ maxHeight: maxH }}
    >
      {/* 손잡이: 아래로 끌면 접기(있으면) 또는 닫기 */}
      <SheetGrip sheetRef={ref} onDismiss={onCollapse ?? onClose} label={onCollapse ? '시트 접기' : '시트 닫기'} />
      <div className="mb-2" />
      {onClose && (
        <button type="button" onClick={onClose} className="absolute right-2 top-1.5 z-10 p-2.5 text-[#766F69]" aria-label="닫기">
          <X size={20} aria-hidden="true" />
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

/** 접힌 하단 시트: 손잡이 + 한 줄. 누르면 onOpen으로 펼친다 */
export function SheetPeek({ title, right, onOpen }: { title: ReactNode; right?: ReactNode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto block w-full rounded-t-[20px] bg-white px-[22px] pb-3 pt-[9px] text-left shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      aria-label="시트 펼치기"
      aria-expanded={false}
    >
      <span className="mx-auto mb-2 block h-1 w-11 rounded-full bg-[#E9E2DA]" />
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#282522]">{title}</span>
        {right}
        <CaretUp size={16} className="shrink-0 text-[#766F69]" aria-hidden="true" />
      </span>
    </button>
  );
}
