'use client';

import { MapOverlay } from './HeatMarker';

/** 아직 열기가 없어 저장되지 않은 주변 음식점·카페 (백엔드가 카카오에서 그때그때 불러옴, GET /api/nearby) */
export type Shop = { kakaoId: string; name: string; category: 'food' | 'cafe'; lat: number; lng: number };

/** 화면에서는 주변 가게를 'kakao:<카카오 ID>'로 구분한다. 열기를 올리면 백엔드가 장소로 저장하고 새 id를 준다 */
export const SHOP_ID_PREFIX = 'kakao:';
export const shopId = (kakaoId: string) => `${SHOP_ID_PREFIX}${kakaoId}`;

/** 회색 작은 점. 누르면 그 가게로 열기 모드 */
export default function ShopDots({ shops, selectedId, onSelect }: { shops: Shop[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <>
      {shops.map(s => {
        const id = shopId(s.kakaoId);
        const on = id === selectedId;
        return (
          <MapOverlay key={id} lat={s.lat} lng={s.lng} zIndex={on ? 500 : 0}>
            {/* 보이는 점은 8px, 누르는 영역은 24px */}
            <button type="button" onClick={() => onSelect(id)} aria-label={`${s.name} (아직 열기 없음)`} className="flex h-6 w-6 items-center justify-center">
              <span
                className={`block rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_rgba(40,37,34,0.2)] ${on ? 'h-3.5 w-3.5 bg-[#E64B3B]' : 'h-2 w-2 bg-[#A8A29E]'}`}
              />
            </button>
          </MapOverlay>
        );
      })}
    </>
  );
}
