'use client';

import { ArrowSquareOut, Check } from '@phosphor-icons/react/dist/ssr';
import { CATEGORY_LABEL, HEAT_RADIUS_BY_CATEGORY } from '@/lib/constants';
import HeatFab from './HeatFab';
import Sheet from './Sheet';
import { SHOP_ID_PREFIX } from './ShopDots';

export type ShopItem = { id: string; name: string; category: 'food' | 'cafe'; lat: number; lng: number };

/** 아직 열기가 없는 주변 가게(카카오) 하단 시트. 첫 열기를 올리면 장소로 저장된다 */
export default function ShopSheet({ shop, distanceM, onClose, onHeat }: { shop: ShopItem; distanceM: number | null; onClose: () => void; onHeat: (id: string) => void }) {
  const kakaoId = shop.id.slice(SHOP_ID_PREFIX.length);
  return (
    <Sheet onClose={onClose} maxH="62vh">
      <div className="flex items-center justify-between gap-2 pr-8 pt-1">
        <h2 className="truncate text-[22px] font-bold leading-8 text-[#282522]">{shop.name}</h2>
        <span className="shrink-0 rounded-2xl bg-[#F6F4F1] px-3 py-1.5 text-xs font-bold text-[#766F69]">열기 없음</span>
      </div>
      <p className="mt-1 text-xs text-[#766F69]">
        {CATEGORY_LABEL[shop.category]}
        {distanceM != null && ` · 내 위치에서 ${distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`}`}
      </p>

      <p className="mt-3 rounded-2xl bg-[#F6F4F1] px-4 py-3.5 text-[13px] leading-5 text-[#282522]">
        아직 아무도 열기를 올리지 않은 곳이에요.
        <br />
        <span className="text-[#766F69]">현장에 있다면 첫 열기를 올려 보세요. 올리면 지도에 온도와 함께 표시돼요.</span>
      </p>

      <a
        href={`https://place.map.kakao.com/${kakaoId}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#B7392D]"
      >
        카카오맵에서 보기
        <ArrowSquareOut size={14} aria-hidden="true" />
      </a>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold text-[#B7392D]">
            <Check size={14} weight="bold" aria-hidden="true" />
            현장에서 {HEAT_RADIUS_BY_CATEGORY[shop.category]}m 이내일 때
          </p>
          <p className="mt-1.5 text-xs text-[#766F69]">불꽃 버튼을 10초 동안 눌러 열기를 올려요</p>
        </div>
        <HeatFab active label="열기" onPress={() => onHeat(shop.id)} />
      </div>
    </Sheet>
  );
}
