'use client';

/* eslint-disable @next/next/no-img-element -- 카카오 프로필 사진·업로드 사진은 외부 주소라 그대로 쓴다 */
import { DotsThree, Fire, ImageSquare, Info, LockSimple, PencilSimpleLine, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import DeletePostSheet from '@/components/DeletePostSheet';
import { BAND_STYLE } from '@/components/HeatMarker';
import { fetcher } from '@/components/PlaceSheet';
import StateCard from '@/components/StateCard';
import TabBar from '@/components/TabBar';
import { authFetcher, signInWithKakao, signOut, useAuth } from '@/lib/auth';
import { getDeviceId } from '@/lib/device';
import type { Post } from '@/lib/posts';
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

const errorCard = (retry: () => void) => (
  <StateCard tone="error" icon={<WarningCircle size={22} />} title="잠시 문제가 생겼어요" body="잠시 후 다시 시도해 주세요" action={{ label: '새로고침', onClick: retry }} />
);

/** MY · 비로그인 (SCREEN 17) / 로그인 (SCREEN 18) */
export default function MePage() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<'footprints' | 'posts'>('posts');
  const [managing, setManaging] = useState<Post | null>(null);
  const { user, loading } = useAuth();
  useEffect(() => setDeviceId(getDeviceId()), []);
  const fp = useSWR<Footprint[]>(deviceId ? `/api/me/footprints?deviceId=${deviceId}` : null, fetcher);
  const mine = useSWR<Post[]>(user ? ['/api/me/posts', user.id] : null, ([url]: [string]) => authFetcher(url));

  const footprints = (
    <>
      {fp.error ? (
        errorCard(() => fp.mutate())
      ) : !fp.data ? (
        <p className="py-6 text-center text-sm text-[#766F69]">불러오는 중…</p>
      ) : fp.data.length === 0 ? (
        <StateCard icon={<Fire size={22} />} title="아직 열기를 올린 곳이 없어요" body="현장에서 첫 번째로 열기를 올려 보세요" action={{ label: '지도 보기', href: '/' }} />
      ) : (
        <ul className="rounded-2xl border border-[#E9E2DA] bg-white px-[14px] py-1">
          {fp.data.map((f, i) => {
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
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#C2462B]">+{f.lastDelta.toFixed(1)}°</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const myPosts = mine.error ? (
    errorCard(() => mine.mutate())
  ) : !mine.data ? (
    <p className="py-6 text-center text-sm text-[#766F69]">불러오는 중…</p>
  ) : mine.data.length === 0 ? (
    <StateCard icon={<PencilSimpleLine size={22} />} title="아직 남긴 글이 없어요" body="현장에서 열기를 올린 뒤 사진과 글을 남겨 보세요" action={{ label: '피드 보기', href: '/feed' }} />
  ) : (
    <>
      <ul className="flex flex-col gap-3">
        {mine.data.map(p => (
          <li key={p.id} className="flex gap-3 rounded-2xl border border-[#E9E2DA] bg-white p-3">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="h-[76px] w-[76px] shrink-0 rounded-xl bg-[#F6F4F1] object-cover" />
            ) : (
              <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-xl bg-[#F6F4F1] text-xl text-[#766F69]" aria-hidden="true">
                <ImageSquare size={24} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-[#766F69]">
                {p.placeName} · {when(p.createdAt)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-[#282522]">{p.text}</p>
            </div>
            <button type="button" onClick={() => setManaging(p)} className="-mr-3 -mt-3 flex h-11 w-11 shrink-0 items-center justify-center text-[#766F69]" aria-label="내 글 관리">
              <DotsThree size={22} weight="bold" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-center text-[11px] text-[#766F69]">오른쪽 위 메뉴에서 게시물을 삭제할 수 있어요</p>
    </>
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-white text-[#282522]">
      <header className="shrink-0 px-[23px] pb-2 pt-[max(env(safe-area-inset-top),48px)]">
        <h1 className="text-[22px] font-bold leading-8">MY</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[17px] pb-6 pt-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-[#766F69]">불러오는 중…</p>
        ) : user ? (
          <>
            {/* 프로필 카드 (SCREEN 18) */}
            <section className="flex items-center gap-3 rounded-2xl bg-[#F6F4F1] p-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="h-12 w-12 shrink-0 rounded-full bg-[#F4A48C]" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold">{user.nickname}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#766F69]">
                  카카오 로그인됨
                </p>
              </div>
              <button type="button" onClick={() => signOut()} className="shrink-0 px-1 text-xs text-[#766F69]">
                로그아웃
              </button>
            </section>

            <div className="flex rounded-2xl bg-[#F6F4F1] p-1" role="tablist">
              {(
                [
                  ['footprints', `열기 발자국 ${fp.data?.length ?? ''}`],
                  ['posts', `내 게시물 ${mine.data?.length ?? ''}`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`h-9 flex-1 rounded-xl text-[13px] ${tab === k ? 'bg-white font-bold text-[#282522] shadow-sm' : 'text-[#766F69]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'posts' ? myPosts : footprints}
          </>
        ) : (
          <>
            {/* 로그인 카드 (SCREEN 17) */}
            <section className="flex flex-col gap-2.5 rounded-2xl bg-[#F6F4F1] p-4">
              <p className="text-base font-bold">로그인하지 않았어요</p>
              <p className="flex items-center gap-1.5 text-xs font-medium text-[#B33E29]">
                <Info size={14} weight="bold" aria-hidden="true" />
                발자국은 이 기기에만 저장돼요
              </p>
              <button
                type="button"
                onClick={async () => setLoginError(await signInWithKakao('/me'))}
                className="h-11 w-full rounded-xl bg-[#FEE500] text-sm font-bold text-[#282522]"
              >
                카카오로 로그인
              </button>
              {loginError && <p className="text-center text-[11px] text-[#B7392D]">{loginError}</p>}
            </section>

            <div className="flex items-center">
              <h2 className="flex-1 text-[17px] font-bold">열기 발자국</h2>
              {!!fp.data?.length && <span className="rounded-[14px] bg-[#FCE8E1] px-2.5 py-[5px] text-[11px] font-bold text-[#B33E29]">{fp.data.length}곳</span>}
            </div>
            {footprints}

            <h2 className="text-[17px] font-bold">내 게시물</h2>
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-[#F6F4F1] p-4 text-center">
              <LockSimple size={22} className="text-[#766F69]" aria-hidden="true" />
              <p className="text-xs text-[#766F69]">로그인하면 내가 올린 글을 모아 보고 삭제할 수 있어요</p>
            </div>
          </>
        )}
      </div>

      <TabBar active="me" />

      {managing && (
        <DeletePostSheet
          post={managing}
          onClose={() => setManaging(null)}
          onDeleted={() => {
            setManaging(null);
            mine.mutate();
          }}
        />
      )}
    </main>
  );
}
