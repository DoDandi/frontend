'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CATEGORY_LABEL, POLL_MS, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { HEAT_RADIUS_BY_CATEGORY } from '@/lib/constants';
import type { Post } from '@/lib/posts';
import HeatFab from './HeatFab';
import { BAND_STYLE } from './HeatMarker';
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
};

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

  const s = BAND_STYLE[p.band];
  const vs = p.vsBaseline;
  const peers = p.peers30m ?? p.peersNow;
  const hot = p.band === 'hot' || p.band === 'daefrica';
  const tiles = (photos ?? []).slice(0, 3);
  return (
    <Sheet onClose={onClose} maxH="78vh">
      <div className="flex items-center justify-between gap-2 pr-8 pt-1">
        <h2 className="truncate text-[26px] font-bold leading-9 text-[#282522]">{p.name}</h2>
        <span className="shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: s.soft, color: s.text }}>
          {hot ? '🔥 ' : ''}
          {BAND_LABEL[p.band]}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#766F69]">
        {CATEGORY_LABEL[p.category]}
        {(p.address ?? p.zoneName) && ` · ${p.address ?? p.zoneName}`}
        {p.eventActive && <span className="ml-2 rounded bg-[#FCE8E1] px-1.5 py-0.5 font-bold text-[#B7392D]">행사 중</span>}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#F6F4F1] px-4 py-[18px]">
        <Stat label="현재 열기" value={`${Math.round(p.temp)}°`} color={s.text} />
        <Stat label="평소 대비" value={vs == null ? '—' : `${vs >= 0 ? '+' : '−'}${Math.abs(Math.round(vs))}°`} color="#EC5B38" />
        <Stat label={p.peers30m != null ? '최근 30분' : '지금 참여'} value={`${peers}명`} />
      </div>
      {vs != null && (
        <p className="mt-3 text-xs leading-[17px] text-[#766F69]">
          평소보다 {Math.abs(Math.round(vs))}° {vs >= 0 ? '뜨거워요' : '조용해요'}. 최근 30분 동안 {peers}명이 열기를 올렸어요.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#282522]">현장에 남긴 순간</span>
        <span className="flex gap-3 text-xs">
          <Link href={`/feed/new?placeId=${p.id}`} className="font-bold text-[#B7392D]">
            + 기록 남기기
          </Link>
          <Link href="/feed" className="text-[#766F69]">
            전체 보기 →
          </Link>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i =>
          tiles[i]?.imageUrl ? (
            <img key={i} src={tiles[i].imageUrl!} alt={`${p.name}에서 남긴 사진`} className="aspect-[110/98] w-full rounded-xl bg-[#F6F4F1] object-cover" />
          ) : (
            <span key={i} className="flex aspect-[110/98] w-full items-center justify-center rounded-xl bg-[#F6F4F1] text-[23px] text-[#A99F96]" aria-hidden="true">
              ▧
            </span>
          )
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#B7392D]">✓ 현장에서 {HEAT_RADIUS_BY_CATEGORY[p.category]}m 이내일 때</p>
          <p className="mt-1.5 text-xs text-[#766F69]">우하단 불꽃을 눌러 열기 보내기</p>
        </div>
        <HeatFab active label="열기" onPress={() => onHeat(p.id)} />
      </div>
    </Sheet>
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
