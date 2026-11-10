'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { BAND_STYLE } from '@/components/HeatMarker';
import { fetcher } from '@/components/PlaceSheet';
import StateCard from '@/components/StateCard';
import TabBar from '@/components/TabBar';
import { getDeviceId } from '@/lib/device';
import { band } from '@/lib/temperature';
import { formatKST, startOfTodayKST } from '@/lib/time';

type Footprint = { placeId: string; name: string; lat: number; lng: number; count: number; lastAt: string; temp: number | null; lastDelta: number };

/** "오늘 19:42" · "어제 21:05" · "11/6 20:30" */
function when(iso: string) {
  const at = new Date(iso);
  const today = startOfTodayKST();
  const hm = formatKST(at);
  if (at >= today) return `오늘 ${hm}`;
  if (at.getTime() >= today.getTime() - 86_400_000) return `어제 ${hm}`;
  return `${formatKST(at, { month: 'numeric', day: 'numeric' }).replace(/\.\s?/g, '/').replace(/\/$/, '')} ${hm}`;
}

/** MY · 비로그인 (피그마 SCREEN 17) */
export default function MePage() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loginNote, setLoginNote] = useState(false);
  useEffect(() => setDeviceId(getDeviceId()), []);
  const { data, error, mutate } = useSWR<Footprint[]>(deviceId ? `/api/me/footprints?deviceId=${deviceId}` : null, fetcher);

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-white text-[#282522]">
      <header className="shrink-0 px-[23px] pb-2 pt-[max(env(safe-area-inset-top),48px)]">
        <h1 className="text-[22px] font-bold leading-8">MY</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[17px] pb-6 pt-2">
        {/* 로그인 카드 */}
        <section className="flex flex-col gap-2.5 rounded-2xl bg-[#F6F4F1] p-4">
          <p className="text-base font-bold">로그인하지 않았어요</p>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#B33E29]">
            <span className="font-bold">ⓘ</span>발자국은 이 기기에만 저장돼요
          </p>
          <button type="button" onClick={() => setLoginNote(true)} className="h-11 w-full rounded-xl bg-[#FEE500] text-sm font-bold text-[#282522]">
            카카오로 로그인
          </button>
          {loginNote && <p className="text-center text-[11px] text-[#766F69]">카카오 로그인은 준비 중이에요</p>}
        </section>

        {/* 열기 발자국 */}
        <div className="flex items-center">
          <h2 className="flex-1 text-[17px] font-bold">🔥 열기 발자국</h2>
          {!!data?.length && <span className="rounded-[14px] bg-[#FCE8E1] px-2.5 py-[5px] text-[11px] font-bold text-[#B33E29]">{data.length}곳</span>}
        </div>
        {error ? (
          <StateCard tone="error" icon="🔧" title="잠시 문제가 생겼어요" body="잠시 후 다시 시도해 주세요" action={{ label: '새로고침', onClick: () => mutate() }} />
        ) : !data ? (
          <p className="py-6 text-center text-sm text-[#766F69]">불러오는 중…</p>
        ) : data.length === 0 ? (
          <StateCard icon="🍃" title="아직 열기를 올린 곳이 없어요" body="현장에서 첫 번째로 열기를 올려 보세요" action={{ label: '지도 보기', href: '/' }} />
        ) : (
          <ul className="rounded-2xl border border-[#E9E2DA] bg-white px-[14px] py-1">
            {data.map((f, i) => {
              const s = f.temp == null ? null : BAND_STYLE[band(f.temp)];
              return (
                <li key={f.placeId} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-[#E9E2DA]' : ''}`}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                    style={{ backgroundColor: s?.soft ?? '#F6F4F1', color: '#282522' }}
                  >
                    {f.temp == null ? '–' : `${Math.round(f.temp)}°`}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <p className="truncate text-sm font-bold">{f.name}</p>
                    <p className="text-[11px] text-[#766F69]">
                      {when(f.lastAt)}에 열기를 올렸어요{f.count > 1 ? ` · ${f.count}회` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#EC5B38]">+{f.lastDelta.toFixed(1)}°</span>
                </li>
              );
            })}
          </ul>
        )}

        {/* 내 게시물 (로그인 후) */}
        <h2 className="text-[17px] font-bold">✍️ 내 게시물</h2>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-[#F6F4F1] p-4 text-center">
          <p className="text-xl">🔒</p>
          <p className="text-xs text-[#766F69]">로그인하면 내가 올린 글을 모아 보고 삭제할 수 있어요</p>
        </div>
      </div>

      <TabBar active="me" />
    </main>
  );
}
