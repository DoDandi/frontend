'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Band } from '@/lib/temperature';
import maplibregl from 'maplibre-gl';
import { useBaseMap } from './BaseMap';

/**
 * 단계별 색 (피그마 변수 heat-stage/1~4, V2 도 단위 기준).
 * color: 기본색, text: 진한 글자색, soft: 칩 배경, onColor: 기본색 위 글자색, dot: 알약 마커 안 원 지름
 */
export const BAND_STYLE: Record<Band, { color: string; text: string; soft: string; onColor: string; dot: number; className: string }> = {
  mild: { color: '#BBD7E6', text: '#3E5A6A', soft: '#EAF3F8', onColor: '#282522', dot: 24, className: '' },
  warm: { color: '#F9B637', text: '#8A5A00', soft: '#FFF1CF', onColor: '#282522', dot: 30, className: '' },
  hot: { color: '#F18D4D', text: '#9A3F12', soft: '#FDE6D6', onColor: '#282522', dot: 34, className: 'heat-pulse-slow' },
  daefrica: { color: '#D94B35', text: '#8F2A1C', soft: '#FCE8E1', onColor: '#FFFFFF', dot: 38, className: 'heat-pulse-fast heat-glow' },
};

/** 지도 위 좌표에 React 요소를 띄우는 마커 */
export function MapOverlay({ lat, lng, zIndex = 1, children }: { lat: number; lng: number; zIndex?: number; children: ReactNode }) {
  const map = useBaseMap();
  const [el] = useState(() => (typeof document !== 'undefined' ? document.createElement('div') : null));
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !el) return;
    const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    setMarker(m);
    return () => {
      m.remove();
    };
    // 위치·zIndex 변경은 아래 effect에서 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el]);

  useEffect(() => {
    if (!marker || !el) return;
    marker.setLngLat([lng, lat]);
    el.style.zIndex = String(zIndex);
  }, [marker, el, lat, lng, zIndex]);

  return el ? createPortal(children, el) : null;
}

type Props = { lat: number; lng: number; name: string; temp: number; band: Band; selected?: boolean; compact?: boolean; onClick?: () => void };

/** 장소 마커: 온도 원 + 장소명 알약. compact면 이름 없이 온도 원만 (이름표가 겹칠 때) */
export default function HeatMarker({ lat, lng, name, temp, band, selected, compact, onClick }: Props) {
  const s = BAND_STYLE[band];
  const mild = band === 'mild';
  const dotStyle = {
    width: s.dot,
    height: s.dot,
    backgroundColor: s.color,
    color: s.onColor,
    fontSize: s.dot >= 34 ? 13 : s.dot >= 30 ? 12 : 10,
    ['--glow' as string]: s.color,
  };
  if (compact) {
    return (
      <MapOverlay lat={lat} lng={lng} zIndex={Math.round(temp)}>
        <button
          type="button"
          onClick={onClick}
          aria-label={`${name} ${Math.round(temp)}도`}
          className={`flex items-center justify-center rounded-full border-2 border-white font-extrabold tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.16)] ${s.className}`}
          style={dotStyle}
        >
          {Math.round(temp)}°
        </button>
      </MapOverlay>
    );
  }
  return (
    <MapOverlay lat={lat} lng={lng} zIndex={selected ? 1000 : 100 + Math.round(temp)}>
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
          style={dotStyle}
        >
          {Math.round(temp)}°
        </span>
        <span className={`text-[13px] ${mild ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{name}</span>
      </button>
    </MapOverlay>
  );
}

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
type MarkerPlace = { id: string; lat: number; lng: number; name: string; temp: number; band: Band };
type LabelMode = 'full' | 'dot' | 'hidden';

/** 화면에서 이름표끼리 겹치지 않게 정한다: 고른 장소 → 뜨거운 순으로 이름표를 두고, 겹치면 온도 원만, 원끼리도 거의 겹치면 숨김 */
export function layoutLabels(
  places: MarkerPlace[],
  selectedId: string | null,
  project: (p: MarkerPlace) => { x: number; y: number },
  textWidth: (name: string) => number,
  view: { width: number; height: number }
): Record<string, LabelMode> {
  const order = [...places].sort(
    (a, b) => Number(b.id === selectedId) - Number(a.id === selectedId) || b.temp - a.temp || a.name.localeCompare(b.name, 'ko')
  );
  const labels: Box[] = [];
  const dots: { x: number; y: number; r: number }[] = [];
  const out: Record<string, LabelMode> = {};
  for (const p of order) {
    const pt = project(p);
    const r = BAND_STYLE[p.band].dot / 2;
    // 화면 밖은 계산 없이 원만 (지도를 옮기면 다시 계산)
    if (pt.x < -200 || pt.y < -60 || pt.x > view.width + 200 || pt.y > view.height + 60) {
      out[p.id] = 'dot';
      continue;
    }
    // 알약: 왼쪽 여백 4 + 원 + 간격 8 + 이름 + 오른쪽 여백 12, 위아래 4씩. 마커는 좌표 가운데에 놓인다
    const w = 4 + r * 2 + 8 + textWidth(p.name) + 12;
    const h = r * 2 + 8;
    const box = { x1: pt.x - w / 2 - 2, x2: pt.x + w / 2 + 2, y1: pt.y - h / 2 - 2, y2: pt.y + h / 2 + 2 };
    if (p.id === selectedId || !labels.some(l => overlaps(l, box))) {
      labels.push(box);
      out[p.id] = 'full';
      continue;
    }
    if (dots.some(d => Math.hypot(d.x - pt.x, d.y - pt.y) < (d.r + r) * 0.6)) {
      out[p.id] = 'hidden';
      continue;
    }
    dots.push({ x: pt.x, y: pt.y, r });
    out[p.id] = 'dot';
  }
  return out;
}

/** 장소 마커 묶음: 지도가 멈출 때마다 이름표 겹침을 다시 계산 */
export function PlaceMarkers({
  places,
  selectedId,
  onSelect,
}: {
  places: MarkerPlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useBaseMap();
  const [modes, setModes] = useState<Record<string, LabelMode>>({});
  useEffect(() => {
    if (!map) return;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) ctx.font = `700 13px ${getComputedStyle(document.body).fontFamily}`;
    const compute = () => {
      const { width, height } = map.getContainer().getBoundingClientRect();
      setModes(
        layoutLabels(
          places,
          selectedId,
          p => map.project([p.lng, p.lat]),
          name => (ctx ? ctx.measureText(name).width : name.length * 13),
          { width, height }
        )
      );
    };
    compute();
    map.on('moveend', compute);
    return () => {
      map.off('moveend', compute);
    };
  }, [map, places, selectedId]);

  return (
    <>
      {places.map(p => {
        const mode = modes[p.id] ?? 'dot';
        if (mode === 'hidden') return null;
        return (
          <HeatMarker
            key={p.id}
            lat={p.lat}
            lng={p.lng}
            name={p.name}
            temp={p.temp}
            band={p.band}
            selected={p.id === selectedId}
            compact={mode === 'dot'}
            onClick={() => onSelect(p.id)}
          />
        );
      })}
    </>
  );
}
