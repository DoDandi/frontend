'use client';

/* eslint-disable @next/next/no-img-element -- 피그마에서 받은 작은 SVG를 그대로 쓴다 */

/**
 * 지도 위 열기 올리기 버튼 (피그마 Component / Live Heat FAB).
 * active: 현장 인증됨 → 누를 때마다 열기. disabled: 현장 밖·위치 확인 중·쿨다운 → 누르면 이유 안내.
 */
export default function HeatFab({
  active,
  label,
  onPress,
  ringKey,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  /** 바뀔 때마다 누르는 순간의 반응 링을 한 번 보여 준다 */
  ringKey?: number;
}) {
  return (
    <button
      type="button"
      onPointerDown={e => {
        // 연타가 빨라도 클릭 지연 없이 바로 센다
        e.preventDefault();
        onPress();
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
      className="relative block h-[90px] w-[76px] touch-manipulation select-none"
      aria-label={active ? `열기 올리기 (${label})` : `열기 올리기 불가: ${label}`}
    >
      {active ? (
        <>
          {ringKey ? (
            <img key={ringKey} src="/figma/heat-tap-ring.svg" alt="" width={78} height={78} className="tap-ring pointer-events-none absolute -left-px -top-[5px]" />
          ) : null}
          <img src="/figma/heat-fab-active-bg.svg" alt="" width={68} height={68} className="absolute left-1 top-0 drop-shadow-[0_4px_10px_rgba(183,57,45,0.35)]" />
          <span className="pointer-events-none absolute left-[15px] top-2 flex h-[46px] w-12 items-center justify-center text-[34px] leading-[48px]">🔥</span>
          <span className="absolute left-2 top-[65px] flex h-[22px] w-[60px] items-center justify-center rounded-[11px] border-[0.75px] border-[#E9E2DA] bg-white text-[11px] font-bold leading-[15px] text-[#B7392D]">
            {label}
          </span>
        </>
      ) : (
        <>
          <img src="/figma/heat-fab-disabled-bg.svg" alt="" width={68} height={68} className="absolute left-1 top-0" />
          <img src="/figma/heat-fab-disabled-flame.svg" alt="" width={36} height={36} className="absolute left-5 top-3.5" />
          <span className="absolute left-2 top-[65px] flex h-[22px] w-[60px] items-center justify-center rounded-[11px] border-[0.75px] border-[#E7D3CD] bg-[#FAF3F0] text-[11px] font-bold leading-[15px] text-[#98746B] tabular-nums">
            {label}
          </span>
        </>
      )}
    </button>
  );
}
