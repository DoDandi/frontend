'use client';

import { Check, Fire } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import useSWR from 'swr';
import { CATEGORY_LABEL, POLL_MS, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { HEAT_RADIUS_BY_CATEGORY } from '@/lib/constants';
import type { Post } from '@/lib/posts';
import HeatFab from './HeatFab';
import { heatStyle } from './HeatMarker';
import Sheet from './Sheet';

export type PlaceDetail = {
  id: string;
  name: string;
  category: Category;
  zoneName: string | null;
  address?: string | null;
  description: string | null;
  lat: number;
  lng: number;
  temp: number;
  band: Band;
  eventActive: boolean;
  peersNow: number;
  /** 평소 대비 몇 도 (T − 20). 백엔드 추가 예정 */
  vsBaseline?: number;
  /** 최근 30분 참여 기기 수. 백엔드 추가 예정 */
  peers30m?: number;
  todayPeak: { temp: number; at: string };
  /** 오늘(KST) 일정: 경기·축제·공연·전시. 시작 1시간 전 ~ 끝까지 bonusActive(열기 +5°) */
  todaySchedules?: TodaySchedule[];
};

export type TodaySchedule = { id: string; title: string; kind: string; startsAt: string; endsAt: string; bonusActive: boolean };

const SCHEDULE_KIND_LABEL: Record<string, string> = {
  baseball: '야구',
  football: '축구',
  basketball: '농구',
  volleyball: '배구',
  festival: '축제',
  show: '공연',
  exhibition: '전시',
  busking: '버스킹',
  etc: '행사',
};
/** "2026-11-10T19:30:00+09:00" → "19:30" (백엔드가 KST로 준다) */
const hhmm = (iso: string) => iso.slice(11, 16);
const SCHEDULE_PREVIEW = 3;

export const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

type Props = {
  placeId: string;
  onClose: () => void;
  /** 지도 위 불꽃 버튼으로 이 장소의 열기를 올린다 */
  onHeat: (placeId: string) => void;
};

/* eslint-disable @next/next/no-img-element -- 사용자 업로드 사진(Supabase Storage) */

/** 장소 상세 바텀시트 (피그마 V2-03) */
export default function PlaceSheet({ placeId, onClose, onHeat }: Props) {
  const { data: p } = useSWR<PlaceDetail>(`/api/places/${placeId}`, fetcher, { refreshInterval: POLL_MS });
  const { data: photos } = useSWR<Post[]>(`/api/places/${placeId}/photos`, fetcher);

  if (!p) {
    return (
      <Sheet onClose={onClose}>
        <div className="py-10 text-center text-sm text-gray-500">불러오는 중…</div>
      </Sheet>
    );
  }

  const s = heatStyle(p.band, p.temp);
  const vs = p.vsBaseline;
  const peers = p.peers30m ?? p.peersNow;
  const hot = p.band === 'hot' || p.band === 'daefrica';
  const photosWithImage = (photos ?? []).filter(t => t.imageUrl).slice(0, 3);
  return (
    <Sheet onClose={onClose} maxH="62vh">
      <div className="flex items-center justify-between gap-2 pr-8 pt-1">
        <h2 className="truncate text-[22px] font-bold leading-8 text-[#282522]">{p.name}</h2>
        <span className="shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: s.soft, color: s.text }}>
          {hot && <Fire size={12} weight="fill" className="inline-block shrink-0 mr-0.5 align-[-1px]" aria-hidden="true" />}
          {BAND_LABEL[p.band]}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#766F69]">
        {CATEGORY_LABEL[p.category]}
        {(p.address ?? p.zoneName) && ` · ${p.address ?? p.zoneName}`}
        {p.eventActive && <span className="ml-2 rounded bg-[#FCE8E1] px-1.5 py-0.5 font-bold text-[#B7392D]">행사 중</span>}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#F6F4F1] px-4 py-3.5">
        <Stat label="현재 열기" value={`${Math.round(p.temp)}°`} color={s.text} />
        <Stat label="평소 대비" value={vs == null ? '—' : `${vs >= 0 ? '+' : '−'}${Math.abs(Math.round(vs))}°`} color="#B7392D" />
        <Stat label={p.peers30m != null ? '최근 30분' : '지금 참여'} value={`${peers}명`} />
      </div>
      {vs != null && (
        <p className="mt-3 text-xs leading-[17px] text-[#766F69]">
          {peers > 0
            ? `평소보다 ${Math.abs(Math.round(vs))}° ${vs >= 0 ? '뜨거워요' : '조용해요'}. 최근 30분 동안 ${peers}명이 열기를 올렸어요.`
            : '아직 조용해요. 현장에 있다면 첫 열기를 올려 보세요.'}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[15px] font-bold text-[#282522]">현장에 남긴 순간</span>
        <span className="flex gap-3 text-xs">
          <Link href={`/feed/new?placeId=${p.id}`} className="font-bold text-[#B7392D]">
            + 기록 남기기
          </Link>
          <Link href="/feed" className="text-[#766F69]">
            전체 보기
          </Link>
        </span>
      </div>
      {/* 사진이 있을 때만 사진 칸을 그린다 (빈 회색 칸 대신 한 줄 안내) */}
      {photosWithImage.length > 0 ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {photosWithImage.map(t => (
            <img key={t.id} src={t.imageUrl!} alt={`${p.name}에서 남긴 사진`} className="aspect-square w-full rounded-xl bg-[#F6F4F1] object-cover" />
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-xl bg-[#F6F4F1] px-3.5 py-3 text-xs text-[#766F69]">아직 남긴 사진이 없어요.</p>
      )}

      {p.todaySchedules && p.todaySchedules.length > 0 && <TodaySchedules list={p.todaySchedules} />}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold text-[#B7392D]">
            <Check size={14} weight="bold" aria-hidden="true" />
            현장에서 {HEAT_RADIUS_BY_CATEGORY[p.category]}m 이내일 때</p>
          <p className="mt-1.5 text-xs text-[#766F69]">불꽃 버튼을 10초 동안 눌러 열기를 올려요</p>
        </div>
        <HeatFab active label="열기" onPress={() => onHeat(p.id)} />
      </div>
    </Sheet>
  );
}

/** 오늘 일정 (경기·축제·공연·전시). 보너스가 켜진 일정은 '진행 중'/'곧 시작' + 열기 +5° */
function TodaySchedules({ list }: { list: TodaySchedule[] }) {
  const now = Date.now();
  return (
    <section className="mt-4" aria-label="오늘 일정">
      <h3 className="text-[15px] font-bold text-[#282522]">오늘 일정</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {list.slice(0, SCHEDULE_PREVIEW).map(e => {
          const ended = Date.parse(e.endsAt) <= now;
          const started = Date.parse(e.startsAt) <= now;
          return (
            <li key={e.id} className={`flex items-center gap-3 rounded-xl bg-[#F6F4F1] px-3.5 py-2.5 ${ended ? 'opacity-50' : ''}`}>
              <span className="shrink-0 text-xs font-bold tabular-nums text-[#282522]">
                {hhmm(e.startsAt)}–{hhmm(e.endsAt)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-[#282522]">{e.title}</span>
                <span className="text-[11px] text-[#766F69]">{SCHEDULE_KIND_LABEL[e.kind] ?? '행사'}</span>
              </span>
              {e.bonusActive && (
                <span className="shrink-0 rounded-lg bg-[#FCE8E1] px-2 py-1 text-[11px] font-bold text-[#B7392D]">
                  {started ? '진행 중' : '곧 시작'} · +5°
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {list.length > SCHEDULE_PREVIEW && <p className="mt-1.5 text-xs text-[#766F69]">외 {list.length - SCHEDULE_PREVIEW}건</p>}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-600">{label}</span>
      <span className="text-2xl font-extrabold tabular-nums" style={{ color: color ?? '#111827' }}>
        {value}
      </span>
    </div>
  );
}
