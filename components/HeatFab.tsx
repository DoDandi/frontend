'use client';

import Link from 'next/link';

/* eslint-disable @next/next/no-img-element -- 피그마에서 받은 작은 SVG를 그대로 쓴다 */

/**
 * 지도 위 열기 올리기 버튼 (피그마 Component / Live Heat FAB).
 * 활성: 장소 반경 150m 안이고 위치를 알 때 → 그 장소의 열기 올리기 화면으로.
 * 비활성: 150m 밖이거나 위치를 모를 때 → 누르면 이유를 알려 준다.
 */
export default function HeatFab({ placeId, onDisabledClick }: { placeId: string | null; onDisabledClick: () => void }) {
  if (placeId) {
    return (
      <Link href={`/heat/${placeId}`} className="relative block h-[90px] w-[76px]" aria-label="열기 올리기">
        <img src="/figma/heat-fab-active-bg.svg" alt="" width={68} height={68} className="absolute left-1 top-0 drop-shadow-[0_4px_10px_rgba(183,57,45,0.35)]" />
        <span className="absolute left-[15px] top-2 flex h-[46px] w-12 items-center justify-center text-[34px] leading-[48px]">🔥</span>
        <span className="absolute left-2 top-[65px] flex h-[22px] w-[60px] items-center justify-center rounded-[11px] border-[0.75px] border-[#E9E2DA] bg-white text-[11px] font-bold leading-[15px] text-[#B7392D]">
          열기
        </span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onDisabledClick} className="relative block h-[90px] w-[76px]" aria-label="열기 올리기 (현장 밖)">
      <img src="/figma/heat-fab-disabled-bg.svg" alt="" width={68} height={68} className="absolute left-1 top-0" />
      <img src="/figma/heat-fab-disabled-flame.svg" alt="" width={36} height={36} className="absolute left-5 top-3.5" />
      <span className="absolute left-2 top-[65px] flex h-[22px] w-[60px] items-center justify-center rounded-[11px] border-[0.75px] border-[#E7D3CD] bg-[#FAF3F0] text-[11px] font-bold leading-[15px] text-[#98746B]">
        현장 밖
      </span>
    </button>
  );
}
