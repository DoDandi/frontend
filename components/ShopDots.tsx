'use client';

import { useEffect, useState } from 'react';
import { useBaseMap } from './BaseMap';
import { MapOverlay } from './HeatMarker';

/** 아직 열기가 없어 저장되지 않은 주변 음식점·카페 (백엔드가 카카오에서 그때그때 불러옴, GET /api/nearby) */
export type Shop = { kakaoId: string; name: string; category: 'food' | 'cafe'; lat: number; lng: number };

/** 화면에서는 주변 가게를 'kakao:<카카오 ID>'로 구분한다. 열기를 올리면 백엔드가 장소로 저장하고 새 id를 준다 */
export const SHOP_ID_PREFIX = 'kakao:';
export const shopId = (kakaoId: string) => `${SHOP_ID_PREFIX}${kakaoId}`;

/** 이 줌부터 가게 점 옆에 이름을 붙인다 (겹치는 이름은 숨김) */
export const SHOP_LABEL_ZOOM = 16;

/** 화면에서 이름표가 서로 겹치지 않는 가게만 고른다 (먼저 온 것 우선, 고른 가게는 항상) */
function useShopLabels(shops: Shop[], selectedId: string | null): Set<string> {
  const map = useBaseMap();
  const [shown, setShown] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!map) return;
    const compute = () => {
      if (map.getZoom() < SHOP_LABEL_ZOOM) return setShown(new Set());
      const boxes: { x1: number; x2: number; y1: number; y2: number }[] = [];
      const out = new Set<string>();
      const order = [...shops].sort((a, b) => Number(shopId(b.kakaoId) === selectedId) - Number(shopId(a.kakaoId) === selectedId));
      for (const s of order) {
        const { x, y } = map.project([s.lng, s.lat]);
        // 점 오른쪽에 11px 글씨 (글자당 약 11px)
        const box = { x1: x + 6, x2: x + 10 + s.name.length * 11, y1: y - 8, y2: y + 8 };
        if (shopId(s.kakaoId) !== selectedId && boxes.some(b => b.x1 < box.x2 && box.x1 < b.x2 && b.y1 < box.y2 && box.y1 < b.y2)) continue;
        boxes.push(box);
        out.add(shopId(s.kakaoId));
      }
      setShown(out);
    };
    compute();
    map.on('moveend', compute);
    return () => {
      map.off('moveend', compute);
    };
  }, [map, shops, selectedId]);
  return shown;
}

/** 회색 작은 점 (줌 16부터 이름). 누르면 그 가게 시트 */
export default function ShopDots({ shops, selectedId, onSelect }: { shops: Shop[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const labeled = useShopLabels(shops, selectedId);
  return (
    <>
      {shops.map(s => {
        const id = shopId(s.kakaoId);
        const on = id === selectedId;
        return (
          <MapOverlay key={id} lat={s.lat} lng={s.lng} zIndex={on ? 500 : 0}>
            {/* 보이는 점은 8px, 누르는 영역은 24px */}
            <button type="button" onClick={() => onSelect(id)} aria-label={`${s.name} (아직 열기 없음)`} className="relative flex h-6 w-6 items-center justify-center">
              <span
                className={`block rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_rgba(40,37,34,0.2)] ${on ? 'h-3.5 w-3.5 bg-[#E64B3B]' : 'h-2 w-2 bg-[#A8A29E]'}`}
              />
              {labeled.has(id) && (
                <span className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-[#766F69] [text-shadow:0_0_2px_#fff,0_0_2px_#fff,0_0_2px_#fff]">
                  {s.name}
                </span>
              )}
            </button>
          </MapOverlay>
        );
      })}
    </>
  );
}
