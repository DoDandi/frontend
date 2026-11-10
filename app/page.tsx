'use client';

import { Fire, MagnifyingGlass, MapPin, WarningCircle, X } from '@phosphor-icons/react/dist/ssr';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import BandLegend from '@/components/BandLegend';
import BaseMap, { MapFlyTo, MapFocus } from '@/components/BaseMap';
import HeatFab from '@/components/HeatFab';
import { CourseCard, CourseOverlay, type Course } from '@/components/CourseLayer';
import FilterChips from '@/components/FilterChips';
import { DAEFRICA_TEMP, DaefricaOverlay, HeatResultSheet, type HeatOutcome } from '@/components/HeatResult';
import HeatSession, { type Fix, type SiteState } from '@/components/HeatSession';
import { OutOfRangeOverlay, OutOfRangeSheet, type OffSite } from '@/components/OutOfRange';
import { MapOverlay, PlaceMarkers } from '@/components/HeatMarker';
import PlaceSearch from '@/components/PlaceSearch';
import PlaceSheet, { fetcher } from '@/components/PlaceSheet';
import Sheet, { SheetPeek } from '@/components/Sheet';
import StateCard from '@/components/StateCard';
import TabBar from '@/components/TabBar';
import { PlaceListSheet, ZoneMarker, ZoneSheet, type ZoneItem, type ZonePlace } from '@/components/ZoneLayer';
import {
  CATEGORY_GROUP,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GPS_MAX_ACCURACY_M,
  HEAT_RADIUS_BY_CATEGORY,
  GROUP_LABEL,
  POLL_MS,
  ZONE_FOCUS_ZOOM,
  LOCATE_ZOOM,
  LOCATE_MAX_FROM_CENTER_M,
  ZONE_ZOOM_THRESHOLD,
  type Group,
} from '@/lib/constants';
import { checkOnSite, distanceM } from '@/lib/geo';
import { BAND_LABEL, type Band } from '@/lib/temperature';

type PlaceItem = ZonePlace & { lat: number; lng: number };

// 구역 미리보기 한 줄 설명 (평소값 20° 기준). 백엔드가 vsBaseline을 주면 숫자로 바꾼다
/** V2-01 문구: "평소보다 22° 높아요" */
const vsText = (v: number) => (Math.round(v) === 0 ? '평소 수준이에요' : `평소보다 ${Math.abs(Math.round(v))}° ${v > 0 ? '높아요' : '낮아요'}`);

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
  const [fix, setFix] = useState<Fix | null>(null);
  const fixRef = useRef<Fix | null>(null);
  // 열기를 올릴 장소로 사용자가 고른 곳 (후보가 여러 곳이거나 장소 상세에서 "열기 올리기"를 눌렀을 때)
  const [chosenId, setChosenId] = useState<string | null>(null);
  // 열기 올리기 결과 (SCREEN 13 결과 시트, 40° 이상이면 SCREEN 14 대프리카 먼저)
  const [outcome, setOutcome] = useState<HeatOutcome | null>(null);
  const [showDaefrica, setShowDaefrica] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [offSite, setOffSite] = useState<OffSite | null>(null);
  const [geoCard, setGeoCard] = useState(false);
  // 현재 위치로 지도 옮기기: 값이 바뀔 때마다 이동 (처음 위치를 받았을 때 한 번 + ◎ 버튼)
  const [locateNonce, setLocateNonce] = useState(0);
  const firstFix = useRef(true);
  // 하단 요약 시트: 처음엔 한 줄로 접어 두고 누르면 펼친다
  const [summaryOpen, setSummaryOpen] = useState(false);
  // 위치 권한 카드는 지도를 가리지 않게 잠시 뒤 스스로 닫는다
  useEffect(() => {
    if (!geoCard) return;
    const t = setTimeout(() => setGeoCard(false), 8_000);
    return () => clearTimeout(t);
  }, [geoCard]);

  // 현장 인증을 위해 위치와 오차를 계속 받는다 (권한이 없으면 null → 비활성)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => {
        const f = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        fixRef.current = f;
        setFix(f);
        // 첫 화면은 현재 위치 기준. 대구 밖(서비스 지역 밖)이면 원도심을 그대로 보여 준다
        if (firstFix.current) {
          firstFix.current = false;
          if (distanceM(f, DEFAULT_CENTER) <= LOCATE_MAX_FROM_CENTER_M) setLocateNonce(n => n + 1);
        }
      },
      () => {
        fixRef.current = null;
        setFix(null);
      },
      { enableHighAccuracy: true, maximumAge: 5_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: places, error: placesError, mutate: refreshPlaces } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: POLL_MS });
  const { data: zones } = useSWR<ZoneItem[]>('/api/zones', fetcher, { refreshInterval: POLL_MS });
  const { data: outcomeCourse } = useSWR<Course>(
    outcome ? `/api/course?lat=${outcome.place.lat}&lng=${outcome.place.lng}&limit=2` : null,
    fetcher
  );

  // 멀리서 보면 구역, 확대하거나 필터를 고르면 장소 마커
  const showZones = !group && zoom < ZONE_ZOOM_THRESHOLD;
  const visiblePlaces = places?.filter(p => !group || CATEGORY_GROUP[p.category] === group);
  const zone = zones?.find(z => z.id === zoneId);
  const selectedPlace = places?.find(p => p.id === selected) ?? null;
  // 장소를 누르면 열기 모드: 지도 위 버튼이 ◎ 내 위치 → 🔥 그 장소 열기 올리기로 바뀐다
  useEffect(() => {
    if (selected) setChosenId(selected);
  }, [selected]);
  const chosenPlace = places?.find(p => p.id === chosenId) ?? null;
  // 현장 인증: 위치 오차 확인 → 장소 종류별 반경 안 후보 → 고른 장소 / 하나뿐인 후보 / 직접 고르기
  const site: SiteState = (() => {
    if (!fix || !places) return { status: 'no-location' };
    if (fix.accuracy > GPS_MAX_ACCURACY_M) return { status: 'locating', accuracyM: Math.round(fix.accuracy) };
    const candidates = (chosenPlace ? [chosenPlace] : places)
      .map(p => ({ p, site: checkOnSite(distanceM(fix, p), fix.accuracy, HEAT_RADIUS_BY_CATEGORY[p.category], GPS_MAX_ACCURACY_M) }))
      .filter(c => c.site.ok)
      .sort((a, b) => a.site.distanceM - b.site.distanceM);
    if (candidates.length === 0) return { status: 'off-site' };
    const pick = candidates.find(c => c.p.id === selected) ?? candidates.find(c => c.p.id === chosenId) ?? (candidates.length === 1 ? candidates[0] : null);
    if (pick) return { status: 'ok', place: { id: pick.p.id, name: pick.p.name } };
    return { status: 'choose', candidates: candidates.map(c => ({ id: c.p.id, name: c.p.name, distanceM: c.site.distanceM })) };
  })();
  // 반경 밖 안내 대상: 고른 장소, 없으면 가장 가까운 장소 (SCREEN 20)
  // 위치를 한 번 더 받는다 (반경 밖 시트·위치 권한 카드 공용)
  const recheckLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const f = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        fixRef.current = f;
        setFix(f);
        setOffSite(null);
        setGeoCard(false);
        setLocateNonce(n => n + 1);
        showToast('위치를 다시 확인했어요');
      },
      () => showToast('위치를 가져오지 못했어요. 브라우저 설정에서 위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
  const openOffSite = () => {
    if (!fix || !places?.length) return;
    const target =
      places.find(p => p.id === (selected ?? chosenId)) ?? places.reduce((a, p) => (distanceM(fix, p) < distanceM(fix, a) ? p : a), places[0]);
    setOffSite({
      place: { id: target.id, name: target.name, lat: target.lat, lng: target.lng },
      radiusM: HEAT_RADIUS_BY_CATEGORY[target.category],
      distanceM: Math.round(distanceM(fix, target)),
    });
  };
  // 쿨다운 중 추천: 지금 인증된 곳을 뺀 가장 뜨거운 곳 (SCREEN 19)
  const certifiedId = site.status === 'ok' ? site.place.id : null;
  const suggest = places?.filter(p => p.id !== certifiedId).reduce<PlaceItem | null>((a, p) => (!a || p.temp > a.temp ? p : a), null) ?? null;
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
      {/* 지도를 넓게 보이도록 제목·갱신 표시를 한 줄로 (휴대폰 기준 약 100px) */}
      <header className="flex shrink-0 flex-col gap-1.5 px-[17px] pb-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex h-10 items-center gap-2 pl-1.5">
          <h1 className="text-xl font-bold leading-7 text-[#282522]">열기지도</h1>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F4F1] text-[#282522]"
            aria-label="장소 검색"
          >
            <MagnifyingGlass size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <FilterChips
          value={group}
          onChange={g => {
            setGroup(g);
            setZoneId(null);
            setListOpen(false); // 필터가 바뀌면 목록 시트가 새로 접힌 채로 열린다
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
          {!showZones && visiblePlaces && (
            <PlaceMarkers
              places={visiblePlaces}
              selectedId={selected}
              onSelect={id => {
                setCourse(null);
                setSelected(id);
              }}
            />
          )}
          {course && <CourseOverlay origin={course.origin} course={course.data} />}
          {offSite && fix && <OutOfRangeOverlay info={offSite} me={fix} />}
          {outcome && (
            <>
              {/* 오른 온도 말풍선 (SCREEN 13) */}
              <MapOverlay lat={outcome.place.lat} lng={outcome.place.lng} zIndex={400}>
                <span className="block -translate-y-11 whitespace-nowrap rounded-[14px] bg-[#C2462B] px-2.5 py-[5px] text-xs font-bold text-white">
                  +{outcome.delta.toFixed(1)}° ↑
                </span>
              </MapOverlay>
              {outcomeCourse && outcomeCourse.stops.length > 0 && <CourseOverlay origin={outcome.place} course={outcomeCourse} padBottom={480} />}
            </>
          )}
          <MapFocus target={selectedPlace} zoom={ZONE_FOCUS_ZOOM} />
          <MapFlyTo target={fix} zoom={LOCATE_ZOOM} nonce={locateNonce} />
          {fix && !offSite && (
            <MapOverlay lat={fix.lat} lng={fix.lng} zIndex={400}>
              <span className="block h-4 w-4 rounded-full border-[3px] border-white bg-[#3B82F6] shadow-[0_0_0_8px_rgba(59,130,246,0.18)]" aria-label="내 위치" />
            </MapOverlay>
          )}
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
          {placesError && !places && (
            <div className="px-[17px] pb-3">
              <StateCard tone="error" icon={<WarningCircle size={22} />} title="잠시 문제가 생겼어요" body="잠시 후 다시 시도해 주세요" action={{ label: '새로고침', onClick: () => refreshPlaces() }} />
            </div>
          )}
          {geoCard && !fix && (
            <div className="px-[17px] pb-3">
              <StateCard
                icon={<MapPin size={22} />}
                title="위치 권한이 필요해요"
                body="열기 올리기는 현장 반경 안에서만 할 수 있어요. 지도는 그대로 볼 수 있어요"
                action={{ label: '위치 다시 확인', onClick: recheckLocation }}
              />
            </div>
          )}
          {!selected && !course && !outcome && !listOpen && !zone && !offSite && !chosenPlace && (
            // 기본 화면: 불꽃 자리의 버튼이 ◎ 현재 위치로 이동
            <div className="pointer-events-none flex justify-end pr-[25px]">
              <div className="pointer-events-auto mb-2.5">
                <HeatFab locate active label="내 위치" onPress={() => (fixRef.current ? setLocateNonce(n => n + 1) : setGeoCard(true))} />
              </div>
            </div>
          )}
          {!selected && !course && !outcome && !listOpen && !zone && !offSite && chosenPlace && (
            <div className="pointer-events-none flex flex-col">
              <div className="pl-[22px]">
                <button
                  type="button"
                  onClick={() => setChosenId(null)}
                  className="pointer-events-auto inline-flex h-[30px] items-center gap-1.5 rounded-2xl border border-[#E9E2DA] bg-white px-3 text-[11px] font-bold text-[#282522]"
                  aria-label="열기 모드 끄기"
                >
                  <Fire size={14} weight="fill" className="inline-block shrink-0 text-[#C2462B]" aria-hidden="true" />
                  {chosenPlace.name}
                  <X size={12} className="text-[#766F69]" aria-hidden="true" />
                </button>
              </div>
            <HeatSession
              site={site}
              fixRef={fixRef}
              onChoose={setChosenId}
              onToast={showToast}
              onOffSite={openOffSite}
              onNoLocation={() => (fix ? showToast('장소를 불러오는 중이에요') : setGeoCard(true))}
              suggest={suggest && { id: suggest.id, name: suggest.name, temp: suggest.temp }}
              onSuggest={id => setSelected(id)}
              onSent={(r, placeId) => {
                refreshPlaces();
                const p = places?.find(x => x.id === placeId);
                if (!p) return;
                setOutcome({ place: { id: p.id, name: p.name, lat: p.lat, lng: p.lng }, ...r });
                setShowDaefrica(r.tempAfter >= DAEFRICA_TEMP);
              }}
            />
            </div>
          )}
        {offSite && !outcome ? (
          <OutOfRangeSheet
            info={offSite}
            onClose={() => setOffSite(null)}
            onRecheck={recheckLocation}
          />
        ) : outcome ? (
          <HeatResultSheet
            outcome={outcome}
            course={outcomeCourse}
            onSelectPlace={id => {
              setOutcome(null);
              setSelected(id);
            }}
            onClose={() => setOutcome(null)}
          />
        ) : selected ? (
          <PlaceSheet
            placeId={selected}
            onClose={() => setSelected(null)}
            onHeat={id => {
              // 시트를 닫고 지도 위 불꽃 버튼으로 그 장소의 열기를 올린다
              setChosenId(id);
              setSelected(null);
              const p = places?.find(x => x.id === id);
              if (!p) return;
              if (!fix) return setGeoCard(true);
              const r = checkOnSite(distanceM(fix, p), fix.accuracy, HEAT_RADIUS_BY_CATEGORY[p.category], GPS_MAX_ACCURACY_M);
              if (r.ok) showToast(`${p.name} 현장 인증! 불꽃 버튼을 눌러 주세요`);
              else if (r.reason === 'LOW_ACCURACY') showToast(`위치 오차가 커요 (${Math.round(fix.accuracy)}m). 잠시 기다려 주세요`);
              else showToast(`${p.name} ${HEAT_RADIUS_BY_CATEGORY[p.category]}m 안에서만 올릴 수 있어요 (지금 ${r.distanceM}m)`);
            }}
          />
        ) : zone && places ? (
          <ZoneSheet zone={zone} places={places} onClose={() => setZoneId(null)} onSelectPlace={setSelected} />
        ) : course ? (
          <CourseCard course={course.data} onClose={() => setCourse(null)} />
        ) : showZones ? (
          hottestZone &&
          (!summaryOpen ? (
            <SheetPeek
              onOpen={() => setSummaryOpen(true)}
              title={`지금 뜨거운 곳 · ${hottestZone.name}`}
              right={<span className="shrink-0 text-sm font-bold tabular-nums text-[#B7392D]">열기 {Math.round(hottestZone.temp)}°</span>}
            />
          ) : (
            <Sheet onCollapse={() => setSummaryOpen(false)}>
              <button type="button" onClick={() => setZoneId(hottestZone.id)} className="block w-full text-left">
                <div className="flex h-8 items-center justify-between">
                  <span className="text-[17px] font-bold leading-[25px] text-[#282522]">지금 뜨거운 곳</span>
                  <span className="flex h-8 min-w-[76px] items-center justify-center rounded-2xl bg-[#FCE8E1] px-2 text-[11px] font-medium leading-4 text-[#B7392D]">
                    {(hottestZone.band === 'hot' || hottestZone.band === 'daefrica') && <Fire size={12} weight="fill" className="mr-0.5" aria-hidden="true" />}
                    {BAND_LABEL[hottestZone.band]}
                  </span>
                </div>
                <div className="mt-[9px] flex h-6 items-center justify-between">
                  <span className="text-[15px] font-bold leading-[22px] text-[#282522]">{hottestZone.name}</span>
                  <span className="text-sm font-bold leading-5 tabular-nums text-[#B7392D]">열기 {Math.round(hottestZone.temp)}°</span>
                </div>
                <p className="mt-1.5 whitespace-pre text-xs leading-[17px] text-[#766F69]">
                  {hottestZone.vsBaseline != null
                    ? hottestZone.peers30m
                      ? `${vsText(hottestZone.vsBaseline)} · 최근 30분 ${hottestZone.peers30m}명 참여`
                      : '아직 조용해요. 첫 열기를 올려 보세요'
                    : `${BAND_DESC[hottestZone.band]}  ·  장소 ${hottestZone.placeCount}곳`}
                </p>
              </button>
              <p className="mt-[11px] border-t border-[#E9E2DA] pt-[11px] text-xs leading-[17px] text-[#766F69]">지도를 확대하면 매장별 열기를 볼 수 있어요</p>
            </Sheet>
          ))
        ) : (
          visiblePlaces && (
            <PlaceListSheet
              key={group ?? 'all'}
              title={group ? `${GROUP_LABEL[group]} 장소` : '주변 장소'}
              badge={{ label: `${group ? GROUP_LABEL[group] + ' ' : ''}${visiblePlaces.length}곳`, bg: '#FCE8E1', fg: '#B7392D' }}
              description={group ? `지도에 표시된 ${GROUP_LABEL[group]} 관련 장소` : '지도에 표시된 장소'}
              origin={fix}
              zoneName={id => zones?.find(z => z.id === id)?.name ?? null}
              places={visiblePlaces}
              onOpenChange={setListOpen}
              onSelectPlace={id => {
                setListOpen(false);
                setSelected(id);
              }}
            />
          )
        )}
        </div>
      </div>

      <TabBar active="map" />

      {outcome && showDaefrica && <DaefricaOverlay outcome={outcome} onNext={() => setShowDaefrica(false)} />}

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
