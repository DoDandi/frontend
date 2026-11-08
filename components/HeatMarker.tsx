'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Band } from '@/lib/temperature';
import { useKakaoMap, type KMap } from './KakaoMap';

export const BAND_STYLE: Record<Band, { color: string; size: number; className: string }> = {
  mild: { color: '#94A3B8', size: 28, className: 'opacity-70' },
  warm: { color: '#FB923C', size: 36, className: '' },
  hot: { color: '#EF4444', size: 44, className: 'heat-pulse-slow' },
  daefrica: { color: '#B91C1C', size: 56, className: 'heat-pulse-fast heat-glow' },
};

/** 지도 위 좌표에 React 요소를 띄우는 커스텀 오버레이 */
export function MapOverlay({ lat, lng, zIndex = 1, children }: { lat: number; lng: number; zIndex?: number; children: ReactNode }) {
  const ctx = useKakaoMap();
  const [el] = useState(() => (typeof document !== 'undefined' ? document.createElement('div') : null));
  const [overlay, setOverlay] = useState<KMap | null>(null);

  useEffect(() => {
    if (!ctx || !el) return;
    const o = new ctx.kakao.maps.CustomOverlay({
      position: new ctx.kakao.maps.LatLng(lat, lng),
      content: el,
      clickable: true,
      zIndex,
    });
    o.setMap(ctx.map);
    setOverlay(o);
    return () => o.setMap(null);
    // 위치·zIndex 변경은 아래 effect에서 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, el]);

  useEffect(() => {
    if (!ctx || !overlay) return;
    overlay.setPosition(new ctx.kakao.maps.LatLng(lat, lng));
    overlay.setZIndex(zIndex);
  }, [ctx, overlay, lat, lng, zIndex]);

  return el ? createPortal(children, el) : null;
}

type Props = { lat: number; lng: number; temp: number; band: Band; selected?: boolean; onClick?: () => void };

export default function HeatMarker({ lat, lng, temp, band, selected, onClick }: Props) {
  const s = BAND_STYLE[band];
  return (
    <MapOverlay lat={lat} lng={lng} zIndex={selected ? 100 : Math.round(temp)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${Math.round(temp)}도`}
        className={`flex items-center justify-center rounded-full border-2 font-bold text-white shadow-md transition-all duration-500 ${s.className} ${selected ? 'border-slate-900' : 'border-white'}`}
        style={{
          width: s.size,
          height: s.size,
          backgroundColor: s.color,
          fontSize: s.size >= 44 ? 15 : 12,
          ['--glow' as string]: s.color,
        }}
      >
        {Math.round(temp)}°
      </button>
    </MapOverlay>
  );
}
