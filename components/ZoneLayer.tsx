'use client';

import { useEffect, useRef } from 'react';
import { CATEGORY_LABEL, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { BAND_STYLE, MapOverlay } from './HeatMarker';
import { useKakaoMap } from './KakaoMap';

export type ZoneItem = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  temp: number;
  band: Band;
  placeCount: number;
};

export type ZonePlace = { id: string; zoneId: string | null; name: string; category: Category; temp: number; band: Band };

/** 구역: 동네 크기의 반투명 원 + 이름·온도 라벨 */
export function ZoneMarker({ zone, onClick }: { zone: ZoneItem; onClick: () => void }) {
  const ctx = useKakaoMap();
  const { color } = BAND_STYLE[zone.band];

  // 누르면 구역으로 확대해 안의 장소 마커가 보이게 한다
  const handleClick = () => {
    if (ctx) {
      ctx.map.setLevel(3);
      ctx.map.setCenter(new ctx.kakao.maps.LatLng(zone.lat, zone.lng));
      // 하단 시트에 가리지 않도록 구역이 화면 위쪽에 오게 지도를 내린다
      ctx.map.panBy(0, Math.round(ctx.map.getNode().offsetHeight * 0.25));
    }
    onClick();
  };
  const clickRef = useRef(handleClick);
  useEffect(() => {
    clickRef.current = handleClick;
  });

  useEffect(() => {
    if (!ctx) return;
    const { kakao, map } = ctx;
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(zone.lat, zone.lng),
      radius: zone.radiusM,
      strokeWeight: 2,
      strokeColor: color,
      strokeOpacity: 0.9,
      fillColor: color,
      fillOpacity: zone.band === 'mild' ? 0.18 : 0.32,
    });
    circle.setMap(map);
    kakao.maps.event.addListener(circle, 'click', () => clickRef.current());
    return () => circle.setMap(null);
  }, [ctx, zone.lat, zone.lng, zone.radiusM, zone.band, color]);

  const hot = zone.band === 'hot' || zone.band === 'daefrica';
  return (
    <MapOverlay lat={zone.lat} lng={zone.lng} zIndex={Math.round(zone.temp)}>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-white shadow-lg ${
          zone.band === 'daefrica' ? 'heat-pulse-fast' : hot ? 'heat-pulse-slow' : ''
        }`}
        style={{ backgroundColor: color }}
      >
        {zone.name}
        <span className="tabular-nums">{Math.round(zone.temp)}°</span>
      </button>
    </MapOverlay>
  );
}

/** 구역을 눌렀을 때: 구역 온도 + 안의 장소를 뜨거운 순으로 */
export function ZoneSheet({
  zone,
  places,
  onClose,
  onSelectPlace,
}: {
  zone: ZoneItem;
  places: ZonePlace[];
  onClose: () => void;
  onSelectPlace: (id: string) => void;
}) {
  const list = places.filter(p => p.zoneId === zone.id).sort((a, b) => b.temp - a.temp);
  return (
    // 카카오 로고를 가리지 않도록 bottom-8
    <div className="absolute inset-x-2 bottom-8 z-20 max-h-[55vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-3 p-2 text-xl text-slate-400" aria-label="닫기">
        ×
      </button>
      <div className="flex items-end gap-3 pr-8">
        <h2 className="text-xl font-bold text-slate-900">{zone.name}</h2>
        <span className="font-black tabular-nums" style={{ color: BAND_STYLE[zone.band].color }}>
          {zone.temp.toFixed(1)}° {BAND_LABEL[zone.band]}
        </span>
      </div>
      {zone.description && <p className="mt-1 text-sm text-slate-500">{zone.description}</p>}
      <ul className="mt-3 divide-y">
        {list.map(p => (
          <li key={p.id}>
            <button type="button" onClick={() => onSelectPlace(p.id)} className="flex w-full items-center gap-3 py-3 text-left">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: BAND_STYLE[p.band].color }}
              >
                {Math.round(p.temp)}°
              </span>
              <span className="flex-1 truncate font-semibold text-slate-800">{p.name}</span>
              <span className="text-xs text-slate-400">{CATEGORY_LABEL[p.category]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
