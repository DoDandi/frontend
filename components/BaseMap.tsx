'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl, { type Map as MLMap } from 'maplibre-gl';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import { MAP_ATTRIBUTION, MAP_STYLE } from '@/lib/mapStyle';

const MapContext = createContext<MLMap | null>(null);

/** 지도 인스턴스. 스타일이 다 불러와진 뒤에만 값이 있다 */
export function useBaseMap() {
  return useContext(MapContext);
}

type Props = {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  children?: ReactNode;
  /** 확대 레벨이 바뀔 때 호출 (컨텍스트에 넣지 않아 오버레이가 다시 만들어지지 않는다) */
  onZoomChange?: (zoom: number) => void;
};

export default function BaseMap({ center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, className, children, onZoomChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  });

  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      // 한글은 타일 서버 글꼴 대신 기기 글꼴로 그린다
      localIdeographFontFamily: '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
    });
    m.touchZoomRotate.disableRotation();
    m.on('zoomend', () => onZoomChangeRef.current?.(m.getZoom()));
    m.on('load', () => setMap(m));
    m.on('error', e => {
      // 타일 하나 실패는 무시하고, 스타일 자체를 못 불러온 경우만 알린다
      if (!m.isStyleLoaded()) setError('지도를 불러오지 못했어요. 네트워크를 확인해 주세요.');
      console.error(e.error);
    });
    return () => {
      setMap(null);
      m.remove();
    };
    // 처음 한 번만 지도를 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // isolate: 마커 z-index가 지도 밖(하단 시트 위)으로 새지 않게
    <div className={`relative isolate ${className ?? ''}`}>
      {/* maplibre CSS가 컨테이너를 position: relative로 바꾸므로 absolute 대신 크기를 직접 준다 */}
      <div ref={ref} className="h-full w-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600">{error}</div>
      )}
      {/* 출처 표시 (OpenStreetMap 라이선스 필수). 하단 시트가 지도 아래를 덮으므로 왼쪽 위에 한 줄로 둔다 */}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute left-2 top-2 z-30 rounded bg-white/75 px-1.5 text-[9px] leading-4 text-gray-600"
      >
        {MAP_ATTRIBUTION}
      </a>
      {map && <MapContext.Provider value={map}>{children}</MapContext.Provider>}
    </div>
  );
}

/** 선택한 장소로 지도를 옮긴다. 장소 마커가 보이도록 확대하고, 하단 시트에 가리지 않게 화면 위쪽에 둔다 */
export function MapFocus({ target, zoom }: { target: { lat: number; lng: number } | null; zoom: number }) {
  const map = useBaseMap();
  const lat = target?.lat;
  const lng = target?.lng;
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), zoom), offset: [0, -Math.round(map.getContainer().offsetHeight * 0.25)] });
  }, [map, lat, lng, zoom]);
  return null;
}
