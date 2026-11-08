'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CATEGORY_LABEL, POLL_MS, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { formatKST } from '@/lib/time';
import { BAND_STYLE } from './HeatMarker';
import PlacePosts from './PlacePosts';
import TempChart, { type TimelinePoint } from './TempChart';

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
  const { data: timeline } = useSWR<TimelinePoint[]>(`/api/places/${placeId}/timeline`, fetcher, {
    refreshInterval: POLL_MS,
  });

  return (
    // 지도 왼쪽 아래 카카오 로고를 가리지 않도록 아래쪽 여백(bottom-8)을 둔다
    <div className="absolute inset-x-2 bottom-8 z-20 max-h-[70vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-3 p-2 text-xl text-slate-400" aria-label="닫기">
        ×
      </button>
      {!p ? (
        <div className="py-10 text-center text-sm text-slate-400">불러오는 중…</div>
      ) : (
        <>
          <div className="text-xs font-semibold text-slate-500">
            {p.zoneName && `${p.zoneName} · `}
            {CATEGORY_LABEL[p.category]}
            {p.eventActive && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-600">행사 중</span>}
          </div>
          <h2 className="mt-1 pr-8 text-xl font-bold text-slate-900">{p.name}</h2>
          {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}

          <div className="mt-4 flex items-end gap-3">
            <span className="text-5xl font-black tabular-nums" style={{ color: BAND_STYLE[p.band].color }}>
              {p.temp.toFixed(1)}°
            </span>
            <span className="mb-2 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: BAND_STYLE[p.band].color }}>
              {BAND_LABEL[p.band]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            지금 <b>{p.peersNow}명</b>이 열기를 올리는 중
          </p>

          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold text-slate-500">최근 6시간</div>
            {timeline ? <TempChart data={timeline} /> : <div className="h-40" />}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            오늘 최고 <b>{p.todayPeak.temp.toFixed(1)}°C</b> · {formatKST(p.todayPeak.at)}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href={`/heat/${p.id}`} className="rounded-2xl bg-red-500 py-3.5 text-center font-bold text-white">
              열기 올리기
            </Link>
            <button
              type="button"
              onClick={() => onCourseFromHere({ lat: p.lat, lng: p.lng })}
              className="rounded-2xl bg-slate-100 py-3.5 font-bold text-slate-800"
            >
              여기서 다음 갈 곳
            </button>
          </div>

          <PlacePosts placeId={p.id} />
        </>
      )}
    </div>
  );
}
