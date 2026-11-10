'use client';

import { Fire, ImageSquare } from '@phosphor-icons/react/dist/ssr';
import { useRef, useState, type ReactNode } from 'react';
import { CATEGORY_LABEL, ZONE_FOCUS_ZOOM, type Category } from '@/lib/constants';
import { BAND_LABEL, type Band } from '@/lib/temperature';
import { distanceM } from '@/lib/geo';
import { BAND_STYLE, MapOverlay } from './HeatMarker';
import { useBaseMap } from './BaseMap';
import { BandChip, SheetPeek } from './Sheet';
import SheetGrip from './SheetGrip';

export type ZoneItem = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  temp: number;
  band: Band;
  /** 평소(20°) 대비 몇 도 */
  vsBaseline?: number;
  /** 최근 30분 참여 기기 수 */
  peers30m?: number;
  placeCount: number;
};

export type ZonePlace = {
  id: string;
  zoneId: string | null;
  name: string;
  category: Category;
  temp: number;
  band: Band;
  lat?: number;
  lng?: number;
  /** 평소(20°) 대비 몇 도 */
  vsBaseline?: number;
  /** 최신 게시물 사진 (목록 썸네일) */
  photoUrl?: string | null;
};

/**
 * 피그마 SCREEN 01 구역 원: 뜨거울수록 크고 진하다.
 * 피그마 예시(96·115·160px, 채움 0.48·0.62·0.74, 테두리는 채움의 0.7배)를 도 단위(27·36·44°)에 맞춰 이었다.
 */
const clampT = (t: number) => Math.min(Math.max(t, 10), 50);
const zoneSize = (t: number) => Math.round(Math.max(64, 96 + (clampT(t) - 27) * 3.76));
const zoneFill = (t: number) => Math.min(0.8, Math.max(0.4, 0.48 + (clampT(t) - 27) * 0.0153));
const alpha = (o: number) => Math.round(o * 255).toString(16).padStart(2, '0');

/** 구역: 온도에 따라 커지고 진해지는 원 + 가운데 큰 온도·구역명 */
export function ZoneMarker({ zone, onClick }: { zone: ZoneItem; onClick: () => void }) {
  const map = useBaseMap();
  const s = BAND_STYLE[zone.band];
  const d = zoneSize(zone.temp);
  const fill = zoneFill(zone.temp);
  const big = d >= 140;

  // 누르면 구역으로 확대해 안의 장소 마커가 보이게 한다
  const handleClick = () => {
    if (map) {
      // 하단 시트에 가리지 않도록 구역이 화면 위쪽에 오게 한다
      map.easeTo({ center: [zone.lng, zone.lat], zoom: ZONE_FOCUS_ZOOM, offset: [0, -Math.round(map.getContainer().offsetHeight * 0.25)] });
    }
    onClick();
  };

  return (
    <MapOverlay lat={zone.lat} lng={zone.lng} zIndex={Math.round(zone.temp)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${zone.name} ${Math.round(zone.temp)}도`}
        className={`flex flex-col items-center justify-center rounded-full text-[#282522] transition-all duration-500 ${
          zone.band === 'daefrica' ? 'heat-pulse-fast' : zone.band === 'hot' ? 'heat-pulse-slow' : ''
        }`}
        style={{ width: d, height: d, backgroundColor: `${s.color}${alpha(fill)}`, border: `1.5px solid ${s.color}${alpha(fill * 0.7)}` }}
      >
        <span className="font-bold tabular-nums" style={{ fontSize: Math.round(0.16 * d + 9.5), lineHeight: 1.45 }}>
          {Math.round(zone.temp)}°
        </span>
        <span className={`whitespace-nowrap ${big ? 'text-[13px] font-bold leading-[19px]' : 'text-[11px] font-medium leading-4'}`}>{zone.name}</span>
      </button>
    </MapOverlay>
  );
}

/* eslint-disable @next/next/no-img-element -- 사용자 업로드 사진(Supabase Storage) 썸네일 */

const fmtVs = (v: number) => `평소 대비 ${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}°`;
const BADGE_ALPHA: Record<Band, string> = { mild: '29', warm: '29', hot: '45', daefrica: '52' };

/** 펼친 목록 한 줄 (피그마 V2-02-B · Component / 장소 목록 행) */
function PlaceListRow({ p, zoneName, onSelect }: { p: ZonePlace; zoneName?: string | null; onSelect: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onSelect(p.id)} className="relative flex h-[102px] w-full items-start gap-4 border-b border-[#E9E2DA] px-1.5 pt-3 text-left">
        {p.photoUrl ? (
          <img src={p.photoUrl} alt="" className="h-[76px] w-[76px] shrink-0 rounded-xl bg-[#F6F4F1] object-cover" />
        ) : (
          <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-xl bg-[#F6F4F1] text-[23px] font-medium text-[#A99F96]" aria-hidden="true">
            <ImageSquare size={24} aria-hidden="true" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col pt-0.5">
          <span className="truncate text-base font-bold leading-[23px] text-[#282522]">{p.name}</span>
          <span className="mt-1 truncate text-[11px] leading-4 text-[#766F69]">
            {CATEGORY_LABEL[p.category]}
            {zoneName && ` · ${zoneName}`}
          </span>
          {p.vsBaseline != null && <span className="mt-2 text-[11px] leading-4 text-[#766F69]">{fmtVs(p.vsBaseline)}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-5 pt-[5px]">
          <span
            className="flex h-[30px] min-w-16 items-center justify-center rounded-[15px] px-2 text-xs font-bold text-[#B7392D] tabular-nums"
            style={{ backgroundColor: `${BAND_STYLE[p.band].color}${BADGE_ALPHA[p.band]}` }}
          >
            {p.temp >= 20 && <Fire size={11} weight="fill" className="inline-block shrink-0 mr-0.5 align-[-1px]" aria-hidden="true" />}
            {Math.round(p.temp)}°
          </span>
          <span className="pr-1.5 text-[22px] font-medium leading-6 text-[#766F69]" aria-hidden="true">
            ›
          </span>
        </span>
      </button>
    </li>
  );
}

/** 장소 목록 시트. 접혀 있으면 위 2곳만, 펼치면 피그마 V2-02-B 목록(정렬·썸네일) */
export function PlaceListSheet({
  title,
  badge,
  places,
  defaultOpen = false,
  description,
  origin,
  zoneName,
  onClose,
  onSelectPlace,
  onOpenChange,
  children,
}: {
  title: string;
  badge?: { label: string; bg: string; fg: string };
  places: ZonePlace[];
  defaultOpen?: boolean;
  /** 펼친 목록 제목 아래 설명 */
  description?: string;
  /** 내 위치 (거리 가까운 순 정렬용) */
  origin?: { lat: number; lng: number } | null;
  zoneName?: (zoneId: string | null) => string | null;
  onClose?: () => void;
  onSelectPlace: (id: string) => void;
  /** 펼침 상태가 바뀔 때 (펼친 동안 지도 위 버튼을 숨기기 위해) */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const [open, setOpenState] = useState(defaultOpen);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const [sort, setSort] = useState<'temp' | 'distance'>('temp');
  const sheetRef = useRef<HTMLDivElement>(null);
  const dist = (p: ZonePlace) => (origin && p.lat != null && p.lng != null ? distanceM(origin, { lat: p.lat, lng: p.lng }) : Infinity);
  const list = [...places].sort((a, b) => (sort === 'distance' ? dist(a) - dist(b) : b.temp - a.temp));

  // 접힌 상태: 제목 한 줄만. 누르면 목록이 올라온다
  if (!open) {
    return <SheetPeek onOpen={() => setOpen(true)} title={title} right={badge && <BandChip {...badge} />} />;
  }

  const sortBtn = (key: 'temp' | 'distance', label: string, w: string) => {
    const on = sort === key;
    const disabled = key === 'distance' && !origin;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setSort(key)}
        className={`h-[34px] ${w} rounded-[17px] border text-[11px] leading-4 disabled:opacity-40 ${on ? 'border-[#B7392D] bg-[#B7392D] font-bold text-white' : 'border-[#E9E2DA] bg-white font-medium text-[#766F69]'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div ref={sheetRef} className="sheet-in pointer-events-auto relative flex max-h-[68vh] w-full flex-col rounded-t-3xl bg-white px-[22px] pt-[9px] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <SheetGrip sheetRef={sheetRef} onDismiss={() => (defaultOpen && onClose ? onClose() : setOpen(false))} label="목록 접기" />
      <div className="mt-[11px] flex items-center justify-between gap-2">
        <h2 className="truncate text-[22px] font-bold leading-8 text-[#282522]">{title}</h2>
        {badge && (
          <span className="flex h-[31px] shrink-0 items-center rounded-2xl bg-[#FCE8E1] px-3 text-[11px] font-bold text-[#B7392D]">{badge.label}</span>
        )}
      </div>
      {description && <p className="mt-1.5 text-xs leading-[17px] text-[#766F69]">{description}</p>}
      {children}
      <div className="mt-3 flex gap-2">
        {sortBtn('temp', '열기 높은 순', 'w-[116px]')}
        {sortBtn('distance', '거리 가까운 순', 'w-[122px]')}
      </div>
      <div className="mt-2 h-px w-full bg-[#E9E2DA]" />
      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#766F69]">아직 표시할 장소가 없어요</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map(p => (
            <PlaceListRow key={p.id} p={p} zoneName={zoneName?.(p.zoneId)} onSelect={onSelectPlace} />
          ))}
        </ul>
      )}
      <p className="whitespace-pre py-4 text-xs font-medium leading-[17px] text-[#766F69]">{'매장을 누르면 해당 장소 상세로 이동해요  ›'}</p>
    </div>
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
