'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Band } from '@/lib/temperature';
import { useKakaoMap, type KMap } from './KakaoMap';

/**
 * 단계별 색 (피그마 A안).
 * color: 기본색, text: 진한 글자색, soft: 칩 배경, onColor: 기본색 위 글자색, dot: 알약 마커 안 원 지름
 */
export const BAND_STYLE: Record<Band, { color: string; text: string; soft: string; onColor: string; dot: number; className: string }> = {
  mild: { color: '#94A3B8', text: '#334155', soft: '#F1F5F9', onColor: '#0F172A', dot: 24, className: '' },
  warm: { color: '#FB923C', text: '#9A3412', soft: '#FFEDD5', onColor: '#431407', dot: 30, className: '' },
  hot: { color: '#EF4444', text: '#991B1B', soft: '#FEE2E2', onColor: '#FFFFFF', dot: 34, className: 'heat-pulse-slow' },
  daefrica: { color: '#B91C1C', text: '#7F1D1D', soft: '#FECACA', onColor: '#FFFFFF', dot: 38, className: 'heat-pulse-fast heat-glow' },
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

type Props = { lat: number; lng: number; name: string; temp: number; band: Band; selected?: boolean; onClick?: () => void };

/** 장소 마커: 온도 원 + 장소명 알약 */
export default function HeatMarker({ lat, lng, name, temp, band, selected, onClick }: Props) {
  const s = BAND_STYLE[band];
  const mild = band === 'mild';
  return (
    <MapOverlay lat={lat} lng={lng} zIndex={selected ? 100 : Math.round(temp)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${name} ${Math.round(temp)}도`}
        className={`flex items-center gap-2 whitespace-nowrap rounded-full py-1 pl-1 pr-3 transition-all duration-500 ${
          mild && !selected ? 'bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.16)]'
        }`}
        style={{ outline: selected ? `2px solid ${s.color}` : undefined }}
      >
        <span
          className={`flex items-center justify-center rounded-full font-extrabold tabular-nums ${s.className}`}
          style={{
            width: s.dot,
            height: s.dot,
            backgroundColor: s.color,
            color: s.onColor,
            fontSize: s.dot >= 34 ? 13 : s.dot >= 30 ? 12 : 10,
            ['--glow' as string]: s.color,
          }}
        >
          {Math.round(temp)}°
        </span>
        <span className={`text-[13px] ${mild ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{name}</span>
      </button>
    </MapOverlay>
  );
}
