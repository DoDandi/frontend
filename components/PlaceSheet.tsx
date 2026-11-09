'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CATEGORY_LABEL, POLL_MS, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { BAND_STYLE } from './HeatMarker';
import Sheet, { BandChip } from './Sheet';

export type PlaceDetail = {
  id: string;
  name: string;
  category: Category;
  zoneName: string | null;
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

type Props = { placeId: string; onClose: () => void; onCourseFromHere: (p: { lat: number; lng: number }) => void };

export default function PlaceSheet({ placeId, onClose, onCourseFromHere }: Props) {
  const { data: p } = useSWR<PlaceDetail>(`/api/places/${placeId}`, fetcher, { refreshInterval: POLL_MS });

  if (!p) {
    return (
      <Sheet onClose={onClose}>
        <div className="py-10 text-center text-sm text-gray-500">불러오는 중…</div>
      </Sheet>
    );
  }

  const s = BAND_STYLE[p.band];
  const vs = p.vsBaseline;
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between gap-2 pr-8">
        <h2 className="truncate text-[22px] font-extrabold text-gray-900">{p.name}</h2>
        <span className="text-xs">
          <BandChip label={BAND_LABEL[p.band]} bg={s.soft} fg={s.text} />
        </span>
      </div>
      <div className="mt-0.5 text-xs text-gray-600">
        {CATEGORY_LABEL[p.category]}
        {p.zoneName && ` · ${p.zoneName}`}
        {p.eventActive && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">행사 중</span>}
      </div>
      {p.description && <p className="mt-1 text-xs text-gray-500">{p.description}</p>}

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-[14px] bg-gray-100 p-3">
        <Stat label="현재 열기" value={`${Math.round(p.temp)}°`} color={s.text} />
        <Stat label="평소 대비" value={vs == null ? '—' : `${vs >= 0 ? '+' : ''}${Math.round(vs)}°`} color="#C2410C" />
        {p.peers30m != null ? (
          <Stat label="최근 30분" value={`${p.peers30m}명`} />
        ) : (
          <Stat label="지금 참여" value={`${p.peersNow}명`} />
        )}
      </div>

      <div className="mt-3">
        <div className="text-sm font-extrabold text-gray-900">현장에 남긴 순간</div>
        <p className="mt-2 rounded-lg bg-gray-50 py-5 text-center text-xs text-gray-500">아직 남긴 사진이 없어요</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onCourseFromHere({ lat: p.lat, lng: p.lng })}
          className="h-[50px] w-[120px] shrink-0 rounded-xl border border-gray-300 text-sm font-bold text-gray-900"
        >
          다음 갈 곳
        </button>
        <Link
          href={`/heat/${p.id}`}
          className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C2410C] text-base font-extrabold text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5" />
          </svg>
          열기 올리기
        </Link>
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
