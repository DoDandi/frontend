'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { CourseCard, CourseOverlay, type Course } from '@/components/CourseLayer';
import FilterChips from '@/components/FilterChips';
import HeatMarker from '@/components/HeatMarker';
import KakaoMap from '@/components/KakaoMap';
import PlaceSheet, { fetcher } from '@/components/PlaceSheet';
import { ZoneMarker, ZoneSheet, type ZoneItem, type ZonePlace } from '@/components/ZoneLayer';
import { DEFAULT_CENTER, DEFAULT_LEVEL, POLL_MS, ZONE_LEVEL_THRESHOLD, type Category } from '@/lib/constants';

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
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [course, setCourse] = useState<{ origin: LatLng; data: Course } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: places } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: POLL_MS });
  const { data: zones } = useSWR<ZoneItem[]>('/api/zones', fetcher, { refreshInterval: POLL_MS });

  // 멀리서 보면 구역, 확대하거나 카테고리를 고르면 장소 마커
  const showZones = !category && level >= ZONE_LEVEL_THRESHOLD;
  const visiblePlaces = places?.filter(p => !category || p.category === category);
  const zone = zones?.find(z => z.id === zoneId);

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
    <main className="relative h-dvh w-full overflow-hidden">
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="pointer-events-auto">
          <FilterChips value={category} onChange={setCategory} />
        </div>
      </div>

      {toast && (
        <div className="absolute inset-x-0 top-16 z-30 mx-auto w-fit rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}

      {selected ? (
        <PlaceSheet placeId={selected} onClose={() => setSelected(null)} onCourseFromHere={showCourse} />
      ) : zone && places ? (
        <ZoneSheet zone={zone} places={places} onClose={() => setZoneId(null)} onSelectPlace={setSelected} />
      ) : course ? (
        <CourseCard course={course.data} onClose={() => setCourse(null)} />
      ) : (
        // 카카오 로고(왼쪽 아래)를 가리지 않도록 bottom-8 위에 둔다
        <div className="absolute inset-x-4 bottom-8 z-10 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => showCourse()} className="rounded-2xl bg-red-500 py-4 font-bold text-white shadow-lg">
            다음 갈 곳
          </button>
          <Link href="/me" className="rounded-2xl bg-white py-4 text-center font-bold text-slate-800 shadow-lg">
            내 발자국
          </Link>
        </div>
      )}
    </main>
  );
}
