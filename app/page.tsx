'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import BandLegend from '@/components/BandLegend';
import BaseMap, { MapFocus } from '@/components/BaseMap';
import { CourseCard, CourseOverlay, type Course } from '@/components/CourseLayer';
import FilterChips from '@/components/FilterChips';
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
  GROUP_LABEL,
  POLL_MS,
  ZONE_FOCUS_ZOOM,
  ZONE_ZOOM_THRESHOLD,
  type Group,
} from '@/lib/constants';
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

  const { data: places } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: POLL_MS });
  const { data: zones } = useSWR<ZoneItem[]>('/api/zones', fetcher, { refreshInterval: POLL_MS });

  // 멀리서 보면 구역, 확대하거나 필터를 고르면 장소 마커
  const showZones = !group && zoom < ZONE_ZOOM_THRESHOLD;
  const visiblePlaces = places?.filter(p => !group || CATEGORY_GROUP[p.category] === group);
  const zone = zones?.find(z => z.id === zoneId);
  const selectedPlace = places?.find(p => p.id === selected) ?? null;
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
        setToast('위치를 가져오지 못해 동성로 기준으로 보여드려요');
        setTimeout(() => setToast(null), 3000);
      }
    }
    const data: Course = await fetcher(`/api/course?lat=${origin.lat}&lng=${origin.lng}`);
    setCourse({ origin, data });
  }, []);

  // 열기 올리기 결과 화면의 "다음 갈 곳 보기"에서 넘어온 경우
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('course') === '1') {
      window.history.replaceState(null, '', '/');
      showCourse();
    }
  }, [showCourse]);

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-white text-gray-900">
      <header className="flex shrink-0 flex-col gap-2 px-[18px] pb-2.5 pt-[max(env(safe-area-inset-top),18px)]">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-extrabold">열기지도</h1>
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F6F4F1] text-gray-800"
            aria-label="장소 검색"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </button>
        </div>
        <p className="-mt-1 flex items-center gap-1.5 text-xs text-gray-600">
          <span className="h-2 w-2 rounded-full bg-[#766F69]" />
          5초마다 갱신
        </p>
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

        <div className="pointer-events-none absolute right-3 top-2.5 z-10">
          <BandLegend />
        </div>
        {!selected && !course && (
          <button
            type="button"
            onClick={() => showCourse()}
            className="absolute right-3 top-12 z-10 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
          >
            다음 갈 곳 →
          </button>
        )}

        {toast && (
          <div className="absolute inset-x-0 top-24 z-30 mx-auto w-fit rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white">
            {toast}
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
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold">지금 뜨거운 곳</span>
                  <span className="flex items-center gap-1 rounded-full bg-[#FCE8E1] px-3 py-1.5 text-xs font-bold text-[#B7392D]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" />
                    </svg>
                    {BAND_LABEL[hottestZone.band]}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-base font-bold">{hottestZone.name}</span>
                  <span className="text-base font-extrabold tabular-nums text-[#B7392D]">열기 {Math.round(hottestZone.temp)}°</span>
                </div>
                <p className="mt-1.5 text-[13px] text-gray-600">
                  {BAND_DESC[hottestZone.band]} · 장소 {hottestZone.placeCount}곳
                </p>
              </button>
              <p className="mt-3 border-t border-[#E9E2DA] pt-3 text-[13px] text-gray-600">지도를 확대하면 장소별 열기를 볼 수 있어요</p>
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
