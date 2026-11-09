'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import BandLegend from '@/components/BandLegend';
import BaseMap, { MapFocus } from '@/components/BaseMap';
import { CourseCard, CourseOverlay, type Course } from '@/components/CourseLayer';
import FilterChips from '@/components/FilterChips';
import HeatFab from '@/components/HeatFab';
import HeatMarker from '@/components/HeatMarker';
import PlaceSearch from '@/components/PlaceSearch';
import PlaceSheet, { fetcher } from '@/components/PlaceSheet';
import Sheet from '@/components/Sheet';
import TabBar from '@/components/TabBar';
import { PlaceListSheet, ZoneMarker, ZoneSheet, type ZoneItem, type ZonePlace } from '@/components/ZoneLayer';
import {
  CATEGORY_GROUP,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  HEAT_RADIUS_M,
  GROUP_LABEL,
  POLL_MS,
  ZONE_FOCUS_ZOOM,
  ZONE_ZOOM_THRESHOLD,
  type Group,
} from '@/lib/constants';
import { distanceM } from '@/lib/geo';
import { BAND_LABEL, type Band } from '@/lib/temperature';

type PlaceItem = ZonePlace & { lat: number; lng: number };

// 구역 미리보기 한 줄 설명 (평소값 20° 기준). 백엔드가 vsBaseline을 주면 숫자로 바꾼다
const BAND_DESC: Record<Band, string> = {
  mild: '평소보다 조용해요',
  warm: '평소만큼 활기 있어요',
  hot: '평소보다 뜨거워요',
  daefrica: '평소보다 훨씬 뜨거워요',
};
type LatLng = { lat: number; lng: number };

function getPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });
}

export default function Home() {
  const [group, setGroup] = useState<Group | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [course, setCourse] = useState<{ origin: LatLng; data: Course } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [myPos, setMyPos] = useState<LatLng | null>(null);

  // 열기 올리기 버튼 활성 여부를 위해 위치를 계속 받는다 (권한이 없으면 null → 비활성)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setMyPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMyPos(null),
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: places } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: POLL_MS });
  const { data: zones } = useSWR<ZoneItem[]>('/api/zones', fetcher, { refreshInterval: POLL_MS });

  // 멀리서 보면 구역, 확대하거나 필터를 고르면 장소 마커
  const showZones = !group && zoom < ZONE_ZOOM_THRESHOLD;
  const visiblePlaces = places?.filter(p => !group || CATEGORY_GROUP[p.category] === group);
  const zone = zones?.find(z => z.id === zoneId);
  const selectedPlace = places?.find(p => p.id === selected) ?? null;
  // 활성 조건: 내 위치에서 가장 가까운 장소가 150m 안 (선택한 장소가 있으면 그 장소 기준)
  const fabPlaceId = (() => {
    if (!myPos || !places) return null;
    const pool = selectedPlace ? [selectedPlace] : places;
    let best: { id: string; d: number } | null = null;
    for (const p of pool) {
      const d = distanceM(myPos, p);
      if (d <= HEAT_RADIUS_M && (!best || d < best.d)) best = { id: p.id, d };
    }
    return best?.id ?? null;
  })();
  const hottestZone = zones?.reduce<ZoneItem | null>((a, z) => (!a || z.temp > a.temp ? z : a), null);

  const showCourse = useCallback(async (from?: LatLng) => {
    setSelected(null);
    setZoneId(null);
    let origin = from;
    if (!origin) {
      try {
        origin = await getPosition();
      } catch {
        origin = DEFAULT_CENTER;
        showToast('위치를 가져오지 못해 동성로 기준으로 보여드려요');
      }
    }
    const data: Course = await fetcher(`/api/course?lat=${origin.lat}&lng=${origin.lng}`);
    setCourse({ origin, data });
  }, [showToast]);

  // 열기 올리기 결과 화면의 "다음 갈 곳 보기"에서 넘어온 경우
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('course') === '1') {
      window.history.replaceState(null, '', '/');
      showCourse();
    }
  }, [showCourse]);

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-white text-gray-900">
      <header className="flex shrink-0 flex-col px-[17px] pb-2 pt-[max(env(safe-area-inset-top),49px)]">
        <div className="flex h-[42px] items-center justify-between pl-1.5">
          <h1 className="text-[22px] font-bold leading-8 text-[#282522]">열기지도</h1>
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F6F4F1] text-[21px] font-medium leading-[30px] text-[#282522]"
            aria-label="장소 검색"
          >
            ⌕
          </button>
        </div>
        <p className="mb-[7px] h-[22px] whitespace-pre pl-1.5 text-[11px] font-medium leading-[22px] text-[#766F69]">{'●  5초마다 갱신'}</p>
        <FilterChips
          value={group}
          onChange={g => {
            setGroup(g);
            setZoneId(null);
          }}
        />
      </header>

      <div className="relative min-h-0 flex-1">
        <BaseMap className="h-full w-full" onZoomChange={setZoom}>
          {showZones &&
            zones?.map(z => (
              <ZoneMarker
                key={z.id}
                zone={z}
                onClick={() => {
                  setCourse(null);
                  // 장소가 하나뿐인 구역(경기장·공연장)은 바로 장소 상세를 연다
                  const only = places?.filter(p => p.zoneId === z.id);
                  if (only?.length === 1) {
                    setZoneId(null);
                    setSelected(only[0].id);
                  } else {
                    setSelected(null);
                    setZoneId(z.id);
                  }
                }}
              />
            ))}
          {!showZones &&
            visiblePlaces?.map(p => (
              <HeatMarker
                key={p.id}
                lat={p.lat}
                lng={p.lng}
                name={p.name}
                temp={p.temp}
                band={p.band}
                selected={p.id === selected}
                onClick={() => {
                  setCourse(null);
                  setSelected(p.id);
                }}
              />
            ))}
          {course && <CourseOverlay origin={course.origin} course={course.data} />}
          <MapFocus target={selectedPlace} zoom={ZONE_FOCUS_ZOOM} />
        </BaseMap>

        <div className="pointer-events-none absolute right-[22px] top-[9px] z-10">
          <BandLegend />
        </div>

        {toast && (
          <div className="absolute inset-x-0 top-24 z-30 mx-auto w-fit rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white">
            {toast}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col">
          {!selected && !course && (
            <div className="pointer-events-auto mb-2.5 mr-[25px] self-end">
              <HeatFab placeId={fabPlaceId} onDisabledClick={() => showToast(myPos ? '장소 150m 안에서만 열기를 올릴 수 있어요' : '위치를 확인할 수 없어요. 위치 권한을 켜 주세요')} />
            </div>
          )}
        {selected ? (
          <PlaceSheet placeId={selected} onClose={() => setSelected(null)} onCourseFromHere={showCourse} />
        ) : zone && places ? (
          <ZoneSheet zone={zone} places={places} onClose={() => setZoneId(null)} onSelectPlace={setSelected} />
        ) : course ? (
          <CourseCard course={course.data} onClose={() => setCourse(null)} />
        ) : showZones ? (
          hottestZone && (
            <Sheet>
              <button type="button" onClick={() => setZoneId(hottestZone.id)} className="block w-full text-left">
                <div className="flex h-8 items-center justify-between">
                  <span className="text-[17px] font-bold leading-[25px] text-[#282522]">지금 뜨거운 곳</span>
                  <span className="flex h-8 min-w-[76px] items-center justify-center rounded-2xl bg-[#FCE8E1] px-2 text-[11px] font-medium leading-4 text-[#B7392D]">
                    {hottestZone.band === 'hot' || hottestZone.band === 'daefrica' ? '🔥 HOT' : BAND_LABEL[hottestZone.band]}
                  </span>
                </div>
                <div className="mt-[9px] flex h-6 items-center justify-between">
                  <span className="text-[15px] font-bold leading-[22px] text-[#282522]">{hottestZone.name}</span>
                  <span className="text-sm font-bold leading-5 tabular-nums text-[#B7392D]">열기 {Math.round(hottestZone.temp)}°</span>
                </div>
                <p className="mt-1.5 whitespace-pre text-xs leading-[17px] text-[#766F69]">
                  {`${BAND_DESC[hottestZone.band]}  ·  장소 ${hottestZone.placeCount}곳`}
                </p>
              </button>
              <p className="mt-[11px] border-t border-[#E9E2DA] pt-[11px] text-xs leading-[17px] text-[#766F69]">지도를 확대하면 매장별 열기를 볼 수 있어요</p>
            </Sheet>
          )
        ) : (
          visiblePlaces && (
            <PlaceListSheet
              key={group ?? 'all'}
              title={group ? `${GROUP_LABEL[group]} 장소` : '주변 장소'}
              badge={{ label: `${visiblePlaces.length}곳`, bg: '#FFEDD5', fg: '#9A3412' }}
              places={visiblePlaces}
              onSelectPlace={setSelected}
            />
          )
        )}
        </div>
      </div>

      <TabBar active="map" />

      {searching && places && (
        <PlaceSearch
          places={places}
          zoneName={id => zones?.find(z => z.id === id)?.name ?? null}
          onClose={() => setSearching(false)}
          onSelect={id => {
            setSearching(false);
            setCourse(null);
            setZoneId(null);
            setSelected(id);
          }}
        />
      )}
    </main>
  );
}
