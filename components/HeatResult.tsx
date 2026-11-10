'use client';

/* eslint-disable @next/next/no-img-element -- 피그마에서 받은 작은 SVG를 그대로 쓴다 */
import { Camera, Fire } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import SheetGrip from './SheetGrip';
import { BAND_LABEL, band } from '@/lib/temperature';
import type { Course } from './CourseLayer';
import { BAND_STYLE } from './HeatMarker';

export type HeatOutcome = {
  place: { id: string; name: string; lat: number; lng: number };
  tempBefore: number;
  tempAfter: number;
  delta: number;
  peers: number;
};

/** 대프리카 연출 기준 (11/7 결정: 40° 이상) */
export const DAEFRICA_TEMP = 40;
const WALK_M_PER_MIN = 80;
/** 동시성 배수 (서버 공식과 같음): min(1 + 0.1 × (n − 1), 2) */
const together = (n: number) => Math.min(1 + 0.1 * (n - 1), 2);

/** 열기 올리기 결과 시트 (피그마 SCREEN 13) */
export function HeatResultSheet({
  outcome,
  course,
  onSelectPlace,
  onClose,
}: {
  outcome: HeatOutcome;
  course: Course | undefined;
  onSelectPlace: (id: string) => void;
  onClose: () => void;
}) {
  const { place, tempBefore, tempAfter, delta, peers } = outcome;
  const b = band(tempAfter);
  const sheetRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={sheetRef} className="sheet-in pointer-events-auto relative flex max-h-[75vh] w-full flex-col gap-[14px] overflow-y-auto rounded-t-3xl bg-white px-[22px] pb-[26px] pt-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <SheetGrip sheetRef={sheetRef} onDismiss={onClose} />
      <div className="flex items-center gap-2">
        <p className="flex flex-1 items-center gap-1.5 text-xl font-bold text-[#282522]">
          <Fire size={20} weight="fill" className="inline-block shrink-0 text-[#D94B35]" aria-hidden="true" />
          열기를 올렸어요!
        </p>
        <span className="rounded-[14px] bg-[#FCE8E1] px-2.5 py-[5px] text-[11px] font-bold text-[#B33E29]">{BAND_LABEL[b]}</span>
      </div>
      <div className="flex items-center gap-[14px]">
        <p className="whitespace-nowrap text-[44px] font-bold tabular-nums text-[#EC5B38]">+{delta.toFixed(1)}°</p>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[15px] font-bold text-[#282522]">
            {place.name}  지금 {Math.round(tempAfter)}°
          </p>
          <p className="whitespace-pre text-[11px] text-[#766F69]">{`${Math.round(tempBefore)}° → ${Math.round(tempAfter)}°  ·  30분에 걸쳐 서서히 식어요`}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-[14px] bg-[#F6F4F1] px-[14px] py-3">
        <img src="/figma/heat-result-avatars.svg" alt="" width={62} height={26} className="shrink-0" />
        {peers > 1 ? (
          <>
            <p className="min-w-0 flex-1 text-xs font-medium text-[#282522]">나 포함 {peers}명이 1분 안에 함께 올렸어요</p>
            <span className="shrink-0 rounded-[14px] bg-[#FFF1CF] px-2 py-[3px] text-[11px] font-bold text-[#B33E29]">함께 ×{together(peers).toFixed(1)}</span>
          </>
        ) : (
          <p className="min-w-0 flex-1 text-xs font-medium text-[#282522]">1분 안에 여럿이 함께 올리면 최대 2배까지 올라가요</p>
        )}
      </div>
      <div className="h-px w-full shrink-0 bg-[#E9E2DA]" />
      <div className="flex items-center">
        <p className="flex-1 whitespace-pre text-[15px] font-bold text-[#282522]">{'다음 갈 곳  ·  열기 코스'}</p>
        <p className="text-[11px] text-[#766F69]">20° 이상만 추천</p>
      </div>
      {!course ? (
        <p className="py-3 text-center text-xs text-[#766F69]">다음 갈 곳을 찾는 중…</p>
      ) : course.stops.length === 0 ? (
        <p className="py-3 text-center text-xs text-[#766F69]">근처에 아직 뜨거운 곳이 없어요</p>
      ) : (
        course.stops.map((s, i) => {
          const sb = band(s.temp);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectPlace(s.id)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[#E9E2DA] bg-white px-3 py-[11px] text-left"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[#FCE8E1] text-xs font-bold text-[#B33E29]">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-sm font-bold text-[#282522]">{s.name}</span>
                <span className="text-[11px] text-[#766F69]">
                  도보 {Math.max(1, Math.round(s.distanceM / WALK_M_PER_MIN))}분 · {s.distanceM}m
                </span>
              </span>
              <span className="shrink-0 rounded-[14px] px-2.5 py-[5px] text-[11px] font-bold text-[#282522]" style={{ backgroundColor: BAND_STYLE[sb].color, color: BAND_STYLE[sb].onColor }}>
                {(sb === 'hot' || sb === 'daefrica') && <Fire size={12} weight="fill" className="inline-block shrink-0 mr-0.5 align-[-1px]" aria-hidden="true" />}
                {Math.round(s.temp)}° {BAND_LABEL[sb]}
              </span>
              <span className="text-lg font-medium text-[#766F69]" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })
      )}
      <div className="flex gap-2">
        <Link
          href={`/feed/new?placeId=${place.id}`}
          className="flex h-[52px] flex-1 items-center justify-center gap-1.5 whitespace-pre rounded-xl border border-[#E9E2DA] bg-white px-4 text-sm font-bold text-[#282522]"
        >
          <Camera size={18} aria-hidden="true" />
          기록 남기기
        </Link>
        <button type="button" onClick={onClose} className="h-[52px] flex-1 rounded-xl bg-[#B33E29] px-4 text-[15px] font-bold text-white">
          확인
        </button>
      </div>
    </div>
  );
}

/** 대프리카 연출 (피그마 SCREEN 14). 40° 이상이면 결과 시트 전에 전체 화면으로 보여 준다 */
export function DaefricaOverlay({ outcome, onNext }: { outcome: HeatOutcome; onNext: () => void }) {
  useEffect(() => {
    navigator.vibrate?.([120, 60, 120, 60, 240]); // iOS 사파리는 진동이 없어 화면 효과만
  }, []);
  const wave = 'pointer-events-none absolute whitespace-nowrap text-[28px] font-bold text-white';
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[linear-gradient(180deg,rgba(217,75,53,0.96)_0%,rgba(236,91,56,0.94)_60%,rgba(249,182,55,0.94)_100%)]" role="dialog" aria-label="대프리카">
      <p className={`${wave} left-[29px] top-[169px] opacity-35`}>〰〰〰</p>
      <p className={`${wave} left-[219px] top-[229px] opacity-30`}>〰〰</p>
      <p className={`${wave} bottom-[175px] left-[59px] opacity-30`}>〰〰〰〰</p>
      <p className={`${wave} bottom-[115px] left-[249px] opacity-35`}>〰〰</p>
      <div className="daefrica-shake absolute inset-x-0 top-[249px] flex flex-col items-center gap-2.5">
        <span className="rounded-[14px] bg-white/20 px-2.5 py-[5px] text-[11px] font-bold text-white">대구 기록급 열기</span>
        <p className="text-[80px] leading-none">🔥</p>
        <p className="text-[44px] font-bold text-white">대프리카!</p>
        <p className="text-base font-medium text-white">
          {outcome.place.name}이 {Math.floor(outcome.tempAfter)}°를 넘었어요
        </p>
        <div className="flex gap-2.5 pt-[14px] text-white">
          <div className="flex flex-col items-center gap-0.5 rounded-[14px] bg-white/20 px-[18px] py-3">
            <p className="text-2xl font-bold tabular-nums">+{outcome.delta.toFixed(1)}°</p>
            <p className="text-[11px] opacity-85">내가 올린 열기</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-[14px] bg-white/20 px-[18px] py-3">
            <p className="text-2xl font-bold tabular-nums">{outcome.peers}명</p>
            <p className="text-[11px] opacity-85">함께 올린 사람</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-[21px] bottom-[max(env(safe-area-inset-bottom),56px)]">
        <button type="button" onClick={onNext} className="h-[52px] w-full rounded-xl bg-white text-[15px] font-bold text-[#282522]">
          다음 갈 곳 보기
        </button>
      </div>
    </div>
  );
}
