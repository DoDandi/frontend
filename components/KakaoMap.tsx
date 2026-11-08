'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_CENTER, DEFAULT_LEVEL } from '@/lib/constants';

// 카카오맵 SDK는 공식 타입이 없어 any로 다룬다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Kakao = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KMap = any;

declare global {
  interface Window {
    kakao: Kakao;
  }
}

let sdkPromise: Promise<Kakao> | null = null;

function loadKakao(): Promise<Kakao> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
    if (!key) return reject(new Error('NEXT_PUBLIC_KAKAO_MAP_JS_KEY 가 설정되지 않았습니다'));
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다 (도메인 등록을 확인하세요)'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

const MapContext = createContext<{ kakao: Kakao; map: KMap } | null>(null);

export function useKakaoMap() {
  return useContext(MapContext);
}

type Props = {
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  children?: ReactNode;
  /** 확대 레벨이 바뀔 때 호출 (컨텍스트에 넣지 않아 오버레이가 다시 만들어지지 않는다) */
  onLevelChange?: (level: number) => void;
};

export default function KakaoMap({ center = DEFAULT_CENTER, level = DEFAULT_LEVEL, className, children, onLevelChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<{ kakao: Kakao; map: KMap } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onLevelChangeRef = useRef(onLevelChange);
  useEffect(() => {
    onLevelChangeRef.current = onLevelChange;
  });

  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then(kakao => {
        if (cancelled || !ref.current) return;
        const map = new kakao.maps.Map(ref.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level,
        });
        kakao.maps.event.addListener(map, 'zoom_changed', () => onLevelChangeRef.current?.(map.getLevel()));
        setCtx({ kakao, map });
      })
      .catch(e => setError(e.message));
    return () => {
      cancelled = true;
    };
    // 처음 한 번만 지도를 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={ref} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600">
          {error}
        </div>
      )}
      {ctx && <MapContext.Provider value={ctx}>{children}</MapContext.Provider>}
    </div>
  );
}
