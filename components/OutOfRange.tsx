'use client';

import { Crosshair, MapPin, NavigationArrow, X } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useRef } from 'react';
import SheetGrip from './SheetGrip';
import { OVERLAY_BEFORE } from '@/lib/mapStyle';
import { useBaseMap } from './BaseMap';
import { MapOverlay } from './HeatMarker';

export type OffSite = { place: { id: string; name: string; lat: number; lng: number }; radiusM: number; distanceM: number };

/** 반경 원 좌표 (m) */
function ring(lng: number, lat: number, r: number): [number, number][] {
  const ky = 111_320;
  const kx = ky * Math.cos((lat * Math.PI) / 180);
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [lng + (r * Math.cos(a)) / kx, lat + (r * Math.sin(a)) / ky];
  });
}

/** 지도 위: 장소 반경 원(점선) + 내 위치까지 점선 + 거리 라벨 (피그마 SCREEN 20) */
export function OutOfRangeOverlay({ info, me }: { info: OffSite; me: { lat: number; lng: number } }) {
  const map = useBaseMap();
  const { place, radiusM, distanceM } = info;

  useEffect(() => {
    if (!map) return;
    map.addSource('range', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { k: 'ring' }, geometry: { type: 'Polygon', coordinates: [ring(place.lng, place.lat, radiusM)] } },
          { type: 'Feature', properties: { k: 'line' }, geometry: { type: 'LineString', coordinates: [[me.lng, me.lat], [place.lng, place.lat]] } },
        ],
      },
    });
    map.addLayer({ id: 'range-fill', type: 'fill', source: 'range', filter: ['==', ['get', 'k'], 'ring'], paint: { 'fill-color': '#E64B3B', 'fill-opacity': 0.1 } }, OVERLAY_BEFORE);
    map.addLayer(
      { id: 'range-ring', type: 'line', source: 'range', filter: ['==', ['get', 'k'], 'ring'], paint: { 'line-color': '#E64B3B', 'line-width': 1.5, 'line-dasharray': [3, 2] } },
      OVERLAY_BEFORE
    );
    map.addLayer(
      { id: 'range-line', type: 'line', source: 'range', filter: ['==', ['get', 'k'], 'line'], paint: { 'line-color': '#282522', 'line-width': 2, 'line-dasharray': [2, 2] } },
      OVERLAY_BEFORE
    );
    const pad = { top: 90, right: 50, bottom: 300, left: 50 };
    map.fitBounds([[Math.min(me.lng, place.lng), Math.min(me.lat, place.lat)], [Math.max(me.lng, place.lng), Math.max(me.lat, place.lat)]], { padding: pad, maxZoom: 17 });
    return () => {
      if (!map.getStyle()) return;
      ['range-line', 'range-ring', 'range-fill'].forEach(id => map.removeLayer(id));
      map.removeSource('range');
    };
  }, [map, place.lat, place.lng, radiusM, me.lat, me.lng]);

  return (
    <>
      <MapOverlay lat={(me.lat + place.lat) / 2} lng={(me.lng + place.lng) / 2} zIndex={500}>
        <span className="block rounded-xl bg-[#282522] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{distanceM}m</span>
      </MapOverlay>
      <MapOverlay lat={me.lat} lng={me.lng} zIndex={500}>
        <span className="block h-4 w-4 rounded-full border-[3px] border-white bg-[#3B82F6] shadow-[0_0_0_8px_rgba(59,130,246,0.18)]" />
      </MapOverlay>
    </>
  );
}

/** 현장 반경 밖 안내 시트 (피그마 SCREEN 04·20) */
export function OutOfRangeSheet({ info, onRecheck, onClose }: { info: OffSite; onRecheck: () => void; onClose: () => void }) {
  const { place, radiusM, distanceM } = info;
  const more = Math.max(0, distanceM - radiusM);
  const progress = Math.min(1, radiusM / Math.max(distanceM, 1));
  const kakaoRoute = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
  const sheetRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={sheetRef} className="sheet-in pointer-events-auto relative w-full rounded-t-3xl bg-white px-[22px] pb-5 pt-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <SheetGrip sheetRef={sheetRef} onDismiss={onClose} />
      <button type="button" onClick={onClose} className="absolute right-2 top-1.5 z-10 p-2.5 text-[#766F69]" aria-label="닫기">
        <X size={20} aria-hidden="true" />
      </button>
      <div className="mt-4 flex items-center justify-between gap-2 pr-8">
        <p className="flex items-center gap-1.5 text-lg font-bold text-[#282522]">
          <MapPin size={20} weight="fill" className="text-[#B7392D]" aria-hidden="true" />
          현장 반경 밖이에요
        </p>
        <span className="shrink-0 rounded-[14px] bg-[#F6F4F1] px-2.5 py-1 text-[11px] font-bold text-[#766F69] tabular-nums">{distanceM}m 떨어짐</span>
      </div>
      <p className="mt-2 text-xs leading-[18px] text-[#766F69]">
        {place.name} {radiusM}m 안으로 들어오면 열기를 올릴 수 있어요. {more}m만 더 가까이 가 보세요.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-[#766F69]">
        <span>나</span>
        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#F6F4F1]">
          <span className="absolute inset-y-0 left-0 rounded-full bg-[#F18D4D]" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="font-bold text-[#B7392D]">{radiusM}m</span>
      </div>
      <div className="mt-5 flex gap-2">
        <a href={kakaoRoute} target="_blank" rel="noreferrer" className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#E9E2DA] text-sm font-bold text-[#282522]">
          <NavigationArrow size={18} aria-hidden="true" />
          길찾기
        </a>
        <button type="button" onClick={onRecheck} className="flex h-[50px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#B33E29] text-sm font-bold text-white">
          <Crosshair size={18} aria-hidden="true" />
          위치 다시 확인
        </button>
      </div>
    </div>
  );
}
