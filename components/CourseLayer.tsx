'use client';

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { OVERLAY_BEFORE } from '@/lib/mapStyle';
import { useBaseMap } from './BaseMap';
import { MapOverlay } from './HeatMarker';
import Sheet from './Sheet';

export type CourseStop = { id: string; name: string; lat: number; lng: number; temp: number; distanceM: number };
export type Course = { stops: CourseStop[]; totalDistanceM: number };

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);

/** 지도 위 번호 마커와 연결선 */
export function CourseOverlay({
  origin,
  course,
  padBottom = 260,
}: {
  origin: { lat: number; lng: number };
  course: Course;
  /** 아래 시트 높이만큼 비워 두고 맞춘다 */
  padBottom?: number;
}) {
  const map = useBaseMap();

  useEffect(() => {
    if (!map || course.stops.length === 0) return;
    const coords = [origin, ...course.stops].map(p => [p.lng, p.lat] as [number, number]);
    map.addSource('course', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } });
    map.addLayer(
      {
        id: 'course',
        type: 'line',
        source: 'course',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0F172A', 'line-width': 5, 'line-opacity': 0.8, 'line-dasharray': [1, 1.5] },
      },
      OVERLAY_BEFORE
    );
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: { top: 80, right: 40, bottom: padBottom, left: 40 }, maxZoom: 16 });
    return () => {
      if (!map.getStyle()) return;
      map.removeLayer('course');
      map.removeSource('course');
    };
  }, [map, origin, course, padBottom]);

  return (
    <>
      <MapOverlay lat={origin.lat} lng={origin.lng} zIndex={200}>
        <div className="h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow" />
      </MapOverlay>
      {course.stops.map((s, i) => (
        <MapOverlay key={s.id} lat={s.lat} lng={s.lng} zIndex={300}>
          <div className="-translate-y-9 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white shadow-lg">
            {i + 1}
          </div>
        </MapOverlay>
      ))}
    </>
  );
}

/** 하단 카드: 정류장 이름, 온도, 거리, 총 이동 거리 */
export function CourseCard({ course, onClose }: { course: Course; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h2 className="text-[15px] font-extrabold text-gray-900">다음 갈 곳</h2>
      {course.stops.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">근처 1.5km 안에 20° 넘는 곳이 아직 없어요.</p>
      ) : (
        <>
          <ol className="mt-3 space-y-2">
            {course.stops.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-semibold text-slate-800">{s.name}</span>
                <span className="font-bold tabular-nums text-[#B91C1C]">{Math.round(s.temp)}°</span>
                <span className="w-14 text-right text-sm tabular-nums text-slate-500">{fmtDist(s.distanceM)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t pt-3 text-sm text-slate-600">
            총 이동 거리 <b>{fmtDist(course.totalDistanceM)}</b>
          </p>
        </>
      )}
    </Sheet>
  );
}
