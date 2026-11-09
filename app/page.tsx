'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import BandLegend from '@/components/BandLegend';
import { CourseCard, CourseOverlay, type Course } from '@/components/CourseLayer';
import FilterChips from '@/components/FilterChips';
import HeatMarker, { BAND_STYLE } from '@/components/HeatMarker';
import KakaoMap from '@/components/KakaoMap';
import PlaceSheet, { fetcher } from '@/components/PlaceSheet';
import Sheet, { BandChip } from '@/components/Sheet';
import TabBar from '@/components/TabBar';
import { PlaceListSheet, ZoneMarker, ZoneSheet, type ZoneItem, type ZonePlace } from '@/components/ZoneLayer';
import {
  CATEGORY_GROUP,
  DEFAULT_CENTER,
  DEFAULT_LEVEL,
  GROUP_LABEL,
  POLL_MS,
  ZONE_LEVEL_THRESHOLD,
  type Group,
} from '@/lib/constants';
import { BAND_LABEL } from '@/lib/temperature';

type PlaceItem = ZonePlace & { lat: number; lng: number };
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
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [course, setCourse] = useState<{ origin: LatLng; data: Course } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: places } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: POLL_MS });
  const { data: zones } = useSWR<ZoneItem[]>('/api/zones', fetcher, { refreshInterval: POLL_MS });

  // 멀리서 보면 구역, 확대하거나 필터를 고르면 장소 마커
  const showZones = !group && level >= ZONE_LEVEL_THRESHOLD;
  const visiblePlaces = places?.filter(p => !group || CATEGORY_GROUP[p.category] === group);
  const zone = zones?.find(z => z.id === zoneId);
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
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-white text-gray-900">
      <header className="flex shrink-0 flex-col gap-2 px-[18px] pb-2.5 pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="text-[22px] font-extrabold">열기지도</h1>
        <p className="-mt-1 text-xs text-gray-600">5초마다 갱신</p>
        <FilterChips
          value={group}
          onChange={g => {
            setGroup(g);
            setZoneId(null);
          }}
        />
      </header>

      <div className="relative min-h-0 flex-1">
        <KakaoMap className="h-full w-full" onLevelChange={setLevel}>
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
        </KakaoMap>

        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
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
                  <span className="text-[15px] font-extrabold">지금 뜨거운 곳</span>
                  <BandChip
                    label={BAND_LABEL[hottestZone.band]}
                    bg={BAND_STYLE[hottestZone.band].soft}
                    fg={BAND_STYLE[hottestZone.band].text}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-base font-bold">{hottestZone.name}</span>
                  <span className="text-base font-extrabold tabular-nums" style={{ color: BAND_STYLE[hottestZone.band].text }}>
                    열기 {Math.round(hottestZone.temp)}°
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">장소 {hottestZone.placeCount}곳 · 눌러서 둘러보기</p>
              </button>
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
    </main>
  );
}
