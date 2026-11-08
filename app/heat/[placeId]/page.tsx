'use client';

import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher, type PlaceDetail } from '@/components/PlaceSheet';
import { GRAVITY, HEAT_RADIUS_M, MAX_TAPS, SHAKE_DIVISOR, TAP_DURATION_SEC } from '@/lib/constants';
import { getDeviceId } from '@/lib/device';
import { distanceM } from '@/lib/geo';

type Phase = 'ready' | 'countdown' | 'tapping' | 'sending' | 'result' | 'error';
type HeatResult = { tempBefore: number; tempAfter: number; delta: number; peers: number };

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

export default function HeatPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const { data: place } = useSWR<PlaceDetail>(`/api/places/${placeId}`, fetcher);

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(3);
  const [remaining, setRemaining] = useState(TAP_DURATION_SEC);
  const [taps, setTaps] = useState(0);
  const [result, setResult] = useState<HeatResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [shownTemp, setShownTemp] = useState(0);

  const tapsRef = useRef(0);
  const recording = useRef(false);
  const shakeSum = useRef(0);
  const shakeSamples = useRef(0);

  // 1. 위치를 계속 받아 거리 표시
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('이 기기에서는 위치를 쓸 수 없어요');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      p => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoError(null);
      },
      () => setGeoError('위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 흔들기 센서: 기록 중일 때만 max(0, |가속도| − 9.8) 누적
  useEffect(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      if (!recording.current) return;
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      shakeSum.current += Math.max(0, Math.hypot(a.x, a.y, a.z) - GRAVITY);
      shakeSamples.current += 1;
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, []);

  const dist = pos && place ? Math.round(distanceM(pos, place)) : null;
  const tooFar = dist != null && dist > HEAT_RADIUS_M;
  const canStart = phase === 'ready' && dist != null && !tooFar;

  // 2. "열기 켜기": iOS는 이 클릭 핸들러 안에서 권한 요청 필수
  async function start() {
    const DM = typeof DeviceMotionEvent !== 'undefined' ? (DeviceMotionEvent as unknown as MotionPermission) : null;
    if (DM?.requestPermission) {
      try {
        await DM.requestPermission(); // 거부돼도 흔들기 0으로 진행
      } catch {
        /* 권한 요청 실패 → 흔들기 0 */
      }
    }
    tapsRef.current = 0;
    shakeSum.current = 0;
    shakeSamples.current = 0;
    setTaps(0);
    setCount(3);
    setPhase('countdown');
  }

  // 3. 3, 2, 1 카운트
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      recording.current = true;
      setRemaining(TAP_DURATION_SEC);
      setPhase('tapping');
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // 10초 타이머
  useEffect(() => {
    if (phase !== 'tapping') return;
    const startedAt = Date.now();
    const iv = setInterval(() => {
      const left = TAP_DURATION_SEC - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        clearInterval(iv);
        recording.current = false;
        setRemaining(0);
        send();
      } else setRemaining(left);
    }, 100);
    return () => clearInterval(iv);
    // send는 ref만 읽으므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 5. POST /api/heat
  async function send() {
    setPhase('sending');
    // 4. 흔들기 세기 = 평균 ÷ 15, 최대 1 (센서 없으면 0)
    const shake = shakeSamples.current ? Math.min(shakeSum.current / shakeSamples.current / SHAKE_DIVISOR, 1) : 0;
    try {
      const res = await fetch('/api/heat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          deviceId: getDeviceId(),
          lat: pos?.lat,
          lng: pos?.lng,
          taps: Math.min(tapsRef.current, 200),
          shake: Math.round(shake * 1000) / 1000,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setResult(body);
        setShownTemp(body.tempBefore);
        setPhase('result');
        return;
      }
      if (body.error === 'TOO_FAR') setErrorMsg(`현장 ${HEAT_RADIUS_M}m 안에서만 올릴 수 있어요 (지금 ${body.distanceM}m)`);
      else if (body.error === 'COOLDOWN')
        setErrorMsg(`조금 쉬었다 다시 올려 주세요 (${Math.floor(body.retryAfterSec / 60)}분 ${body.retryAfterSec % 60}초 후)`);
      else setErrorMsg('열기를 올리지 못했어요. 잠시 후 다시 시도해 주세요');
    } catch {
      setErrorMsg('네트워크 오류가 났어요');
    }
    setPhase('error');
  }

  // 결과 온도 숫자 애니메이션 + 대프리카 모드 진동
  useEffect(() => {
    if (phase !== 'result' || !result) return;
    const from = result.tempBefore;
    const to = result.tempAfter;
    const startedAt = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - startedAt) / 1500, 1);
      setShownTemp(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (to >= 50) navigator.vibrate?.([200, 100, 200, 100, 400]); // iOS는 미지원 → 화면 효과만
    return () => cancelAnimationFrame(raf);
  }, [phase, result]);

  function tap() {
    if (phase !== 'tapping') return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  }

  const gauge = Math.min(taps / MAX_TAPS, 1);
  const daefrica = phase === 'result' && result && result.tempAfter >= 50;

  return (
    <main
      className={`relative flex min-h-dvh flex-col items-center px-6 pb-10 pt-[max(env(safe-area-inset-top),24px)] ${
        daefrica ? 'daefrica-mode text-white' : 'bg-slate-950 text-white'
      }`}
    >
      <Link href="/" className="self-start text-sm text-white/60">
        ← 지도
      </Link>
      <h1 className="mt-4 text-center text-2xl font-black">{place?.name ?? '…'}</h1>
      {place && phase !== 'result' && <p className="mt-1 text-white/60">지금 {place.temp.toFixed(1)}°C</p>}

      {phase === 'ready' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-center text-white/80">
            {geoError ?? (dist == null ? '위치 확인 중…' : tooFar ? `현장 ${HEAT_RADIUS_M}m 안에서만 올릴 수 있어요 (지금 ${dist}m)` : `현장까지 ${dist}m`)}
          </p>
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            className="h-44 w-44 rounded-full bg-red-500 text-2xl font-black shadow-[0_0_60px_rgba(239,68,68,0.6)] disabled:bg-slate-700 disabled:shadow-none"
          >
            열기 켜기
          </button>
          <p className="text-center text-xs text-white/50">
            10초 동안 버튼을 연타하고 폰을 흔들어 주세요
          </p>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-1 items-center justify-center text-[120px] font-black">{count}</div>
      )}

      {(phase === 'tapping' || phase === 'sending') && (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
          <div className="text-4xl font-black tabular-nums">{remaining.toFixed(1)}s</div>
          <div className="flex items-end gap-6">
            {/* 온도계 게이지 (로컬 연출) */}
            <div className="relative h-64 w-8 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-orange-400 via-red-500 to-red-700 transition-[height] duration-150"
                style={{ height: `${Math.max(gauge * 100, 6)}%` }}
              />
            </div>
            <button
              type="button"
              onPointerDown={tap}
              disabled={phase !== 'tapping'}
              className="h-56 w-56 touch-manipulation select-none rounded-full bg-red-500 text-6xl font-black tabular-nums shadow-[0_0_80px_rgba(239,68,68,0.7)] active:scale-95"
            >
              {taps}
            </button>
          </div>
          <p className="text-white/60">{phase === 'sending' ? '열기 올리는 중…' : '연타! 흔들어!'}</p>
        </div>
      )}

      {phase === 'result' && result && (
        <div className={`flex flex-1 flex-col items-center justify-center gap-3 ${daefrica ? 'daefrica-shake' : ''}`}>
          {daefrica && <div className="text-3xl font-black tracking-widest">🔥 대프리카 🔥</div>}
          <div className="text-8xl font-black tabular-nums">{shownTemp.toFixed(1)}°</div>
          <p className="text-xl font-bold">
            +{result.delta.toFixed(1)}°C · 지금 {result.peers}명이 같이 터뜨렸어요
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg">{errorMsg}</p>
          <button type="button" onClick={() => setPhase('ready')} className="rounded-xl bg-white/10 px-5 py-3 font-bold">
            다시 시도
          </button>
        </div>
      )}

      {(phase === 'result' || phase === 'error') && (
        <div className="grid w-full grid-cols-2 gap-2">
          <Link href="/" className="rounded-2xl bg-white/15 py-4 text-center font-bold">
            지도로 돌아가기
          </Link>
          <Link href="/?course=1" className="rounded-2xl bg-white py-4 text-center font-bold text-slate-900">
            다음 갈 곳 보기
          </Link>
        </div>
      )}
    </main>
  );
}
