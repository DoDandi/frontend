'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CATEGORY_LABEL, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { BAND_STYLE, MapOverlay } from './HeatMarker';
import { useKakaoMap } from './KakaoMap';
import Sheet, { BandChip } from './Sheet';

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

/** 구역: 동네 크기의 반투명 원 + 가운데 큰 온도·구역명 */
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
      fillOpacity: zone.band === 'mild' ? 0.32 : zone.band === 'warm' ? 0.28 : 0.24,
    });
    circle.setMap(map);
    kakao.maps.event.addListener(circle, 'click', () => clickRef.current());
    return () => circle.setMap(null);
  }, [ctx, zone.lat, zone.lng, zone.radiusM, zone.band, color]);

  const s = BAND_STYLE[zone.band];
  const size = zone.band === 'mild' ? 20 : zone.band === 'warm' ? 24 : 34;
  return (
    <MapOverlay lat={zone.lat} lng={zone.lng} zIndex={Math.round(zone.temp)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${zone.name} ${Math.round(zone.temp)}도`}
        className={`flex flex-col items-center whitespace-nowrap leading-none [text-shadow:0_0_6px_rgba(255,255,255,0.9)] ${
          zone.band === 'daefrica' ? 'heat-pulse-fast' : zone.band === 'hot' ? 'heat-pulse-slow' : ''
        }`}
      >
        <span className="font-extrabold tabular-nums" style={{ fontSize: size, color: s.text }}>
          {Math.round(zone.temp)}°
        </span>
        <span className="mt-1 font-bold" style={{ fontSize: size >= 34 ? 13 : 11, color: s.text }}>
          {zone.name}
        </span>
      </button>
    </MapOverlay>
  );
}

/** 장소 한 줄: 온도 원 + 이름 + 카테고리 */
function PlaceRow({ p, onSelect }: { p: ZonePlace; onSelect: (id: string) => void }) {
  const s = BAND_STYLE[p.band];
  return (
    <li>
      <button type="button" onClick={() => onSelect(p.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums"
          style={{ backgroundColor: s.color, color: s.onColor }}
        >
          {Math.round(p.temp)}°
        </span>
        <span className="flex-1 truncate text-[15px] font-bold text-gray-900">{p.name}</span>
        <span className="text-xs text-gray-500">{CATEGORY_LABEL[p.category]}</span>
      </button>
    </li>
  );
}

/** 장소 목록 시트: 뜨거운 순. 접혀 있으면 위 2곳만 보여 준다 */
export function PlaceListSheet({
  title,
  badge,
  places,
  defaultOpen = false,
  onClose,
  onSelectPlace,
  children,
}: {
  title: string;
  badge?: { label: string; bg: string; fg: string };
  places: ZonePlace[];
  defaultOpen?: boolean;
  onClose?: () => void;
  onSelectPlace: (id: string) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const list = [...places].sort((a, b) => b.temp - a.temp);
  return (
    <Sheet onClose={onClose} maxH="55vh">
      <div className="flex items-center justify-between gap-2 pr-8">
        <h2 className="truncate text-[15px] font-extrabold text-gray-900">{title}</h2>
        {badge && <BandChip {...badge} />}
      </div>
      {children}
      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">아직 열기가 오른 곳이 없어요</p>
      ) : open ? (
        <ul className="mt-1 divide-y divide-gray-100">
          {list.map(p => (
            <PlaceRow key={p.id} p={p} onSelect={onSelectPlace} />
          ))}
        </ul>
      ) : (
        <>
          <div className="mt-2 flex gap-2 text-xs">
            {list.slice(0, 2).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlace(p.id)}
                className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-2.5 py-2 text-left"
              >
                {p.name} {Math.round(p.temp)}°
              </button>
            ))}
          </div>
          {list.length > 2 && (
            <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full text-center text-xs font-bold text-[#B4431F]">
              ↑ 목록 펼쳐 보기
            </button>
          )}
        </>
      )}
    </Sheet>
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
  const s = BAND_STYLE[zone.band];
  return (
    <PlaceListSheet
      title={zone.name}
      badge={{ label: BAND_LABEL[zone.band], bg: s.soft, fg: s.text }}
      places={places.filter(p => p.zoneId === zone.id)}
      defaultOpen
      onClose={onClose}
      onSelectPlace={onSelectPlace}
    >
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-xs text-gray-600">{zone.description ?? `장소 ${zone.placeCount}곳`}</span>
        <span className="text-base font-extrabold tabular-nums" style={{ color: s.text }}>
          열기 {Math.round(zone.temp)}°
        </span>
      </div>
    </PlaceListSheet>
  );
}
