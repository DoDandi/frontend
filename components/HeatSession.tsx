'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { COOLDOWN_MIN, GPS_MAX_ACCURACY_M, GRAVITY, MAX_TAPS, SHAKE_DIVISOR, TAP_DURATION_SEC } from '@/lib/constants';
import { getDeviceId } from '@/lib/device';
import HeatFab from './HeatFab';

export type Fix = { lat: number; lng: number; accuracy: number };
export type SiteState =
  | { status: 'no-location' }
  | { status: 'locating'; accuracyM: number }
  | { status: 'off-site' }
  | { status: 'choose'; candidates: { id: string; name: string; distanceM: number }[] }
  | { status: 'ok'; place: { id: string; name: string } };

type Result = { tempBefore: number; tempAfter: number; delta: number; peers: number };
type Phase = { kind: 'idle' } | { kind: 'tapping' } | { kind: 'sending' } | { kind: 'done'; result: Result } | { kind: 'error'; message: string };
type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

const COOLDOWN_KEY = 'yeolgi-heat-cooldown';
const readCooldowns = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const fmtLeft = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 지도 위 열기 올리기 (피그마 SCREEN 05·06). V앱 하트처럼 불꽃 버튼을 누른다.
 * 첫 터치로 10초가 시작되고, 그동안 누른 횟수와 흔들기를 함께 센 뒤 POST /api/heat.
 */
export default function HeatSession({
  site,
  fixRef,
  onChoose,
  onToast,
  onSent,
}: {
  site: SiteState;
  fixRef: RefObject<Fix | null>;
  onChoose: (placeId: string) => void;
  onToast: (msg: string) => void;
  onSent: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [taps, setTaps] = useState(0);
  const [remaining, setRemaining] = useState(TAP_DURATION_SEC);
  const [flames, setFlames] = useState<{ id: number; dx: number; s: number }[]>([]);
  const [ringKey, setRingKey] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [daefrica, setDaefrica] = useState(false);

  const tapsRef = useRef(0);
  const sessionPlace = useRef<{ id: string; name: string } | null>(null);
  const shake = useRef({ on: false, sum: 0, n: 0 });
  const flameId = useRef(0);

  useEffect(() => setCooldowns(readCooldowns()), []);

  const place = site.status === 'ok' ? site.place : null;
  const shownPlace = phase.kind === 'idle' ? place : sessionPlace.current;
  const cooldownLeft = place ? (cooldowns[place.id] ?? 0) - now : 0;

  // 쿨다운 남은 시간 표시용 시계
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldownLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCooldown = useCallback((placeId: string, until: number) => {
    setCooldowns(prev => {
      const next = { ...prev, [placeId]: until };
      try {
        localStorage.setItem(COOLDOWN_KEY, JSON.stringify(next));
      } catch {
        /* 저장 못 해도 서버가 429로 막는다 */
      }
      return next;
    });
    setNow(Date.now());
  }, []);

  // 흔들기: 세는 동안만 max(0, |가속도| − 9.8)를 더한다
  useEffect(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      if (!shake.current.on) return;
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      shake.current.sum += Math.max(0, Math.hypot(a.x, a.y, a.z) - GRAVITY);
      shake.current.n += 1;
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, []);

  const send = useCallback(async () => {
    shake.current.on = false;
    const target = sessionPlace.current;
    const fix = fixRef.current;
    if (!target) return;
    setPhase({ kind: 'sending' });
    const s = shake.current.n ? Math.min(shake.current.sum / shake.current.n / SHAKE_DIVISOR, 1) : 0;
    try {
      const res = await fetch('/api/heat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: target.id,
          deviceId: getDeviceId(),
          lat: fix?.lat,
          lng: fix?.lng,
          accuracy: fix ? Math.round(fix.accuracy) : undefined,
          taps: Math.min(tapsRef.current, 200),
          shake: Math.round(s * 1000) / 1000,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setCooldown(target.id, Date.now() + COOLDOWN_MIN * 60_000);
        setPhase({ kind: 'done', result: body });
        onSent();
        if (body.tempAfter >= 40) {
          setDaefrica(true);
          navigator.vibrate?.([120, 60, 120, 60, 240]);
          setTimeout(() => setDaefrica(false), 1800);
        }
        return;
      }
      let message = '잠시 뒤 다시 시도해 주세요';
      if (body.error === 'COOLDOWN') {
        setCooldown(target.id, Date.now() + body.retryAfterSec * 1000);
        message = `${Math.ceil(body.retryAfterSec / 60)}분 뒤에 다시 올릴 수 있어요`;
      } else if (body.error === 'LOW_ACCURACY') message = `위치 오차가 커요 (${body.accuracyM}m). 하늘이 보이는 곳에서 다시 해 주세요`;
      else if (body.error === 'TOO_FAR') message = `${target.name} ${body.radiusM}m 안에서만 올릴 수 있어요 (지금 ${body.distanceM}m)`;
      setPhase({ kind: 'error', message });
    } catch {
      setPhase({ kind: 'error', message: '네트워크 연결을 확인해 주세요' });
    }
  }, [fixRef, onSent, setCooldown]);

  // 10초 타이머. 위치가 바뀌어 다시 그려져도 타이머가 처음부터 다시 시작되지 않도록 send는 ref로 부른다
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (phase.kind !== 'tapping') return;
    const startedAt = Date.now();
    const iv = setInterval(() => {
      const left = TAP_DURATION_SEC - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        clearInterval(iv);
        setRemaining(0);
        sendRef.current();
      } else setRemaining(left);
    }, 100);
    return () => clearInterval(iv);
  }, [phase.kind]);

  // 완료·오류 안내는 잠시 보여 주고 원래 상태로
  useEffect(() => {
    if (phase.kind !== 'done' && phase.kind !== 'error') return;
    const t = setTimeout(() => setPhase({ kind: 'idle' }), phase.kind === 'done' ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [phase]);

  const spawnFlame = () => {
    const id = ++flameId.current;
    setFlames(f => [...f.slice(-24), { id, dx: Math.round((Math.random() - 0.5) * 90), s: 0.7 + Math.random() * 0.6 }]);
    setTimeout(() => setFlames(f => f.filter(x => x.id !== id)), 1400);
    setRingKey(k => k + 1);
  };

  const requestMotion = () => {
    const DM = typeof DeviceMotionEvent !== 'undefined' ? (DeviceMotionEvent as unknown as MotionPermission) : null;
    if (!DM?.requestPermission) return;
    // iOS는 사용자 동작 안에서만 권한을 물을 수 있다. 실패하면 손을 뗄 때(touchend) 한 번 더 묻는다
    DM.requestPermission().catch(() =>
      window.addEventListener('touchend', () => DM.requestPermission?.().catch(() => undefined), { once: true })
    );
  };

  const press = () => {
    if (phase.kind === 'tapping') {
      tapsRef.current += 1;
      setTaps(tapsRef.current);
      spawnFlame();
      return;
    }
    if (phase.kind === 'sending') return;
    if (site.status !== 'ok') {
      onToast(
        site.status === 'no-location'
          ? '위치 권한을 켜야 열기를 올릴 수 있어요'
          : site.status === 'locating'
            ? `위치 오차가 커요 (${site.accuracyM}m). 하늘이 보이는 곳에서 잠시 기다려 주세요`
            : site.status === 'choose'
              ? '어느 장소인지 먼저 골라 주세요'
              : '장소 가까이에서만 열기를 올릴 수 있어요'
      );
      return;
    }
    if (cooldownLeft > 0) {
      const sec = Math.ceil(cooldownLeft / 1000);
      onToast(`${Math.floor(sec / 60)}분 ${sec % 60}초 뒤에 다시 올릴 수 있어요`);
      return;
    }
    // 첫 터치: 10초 시작
    requestMotion();
    sessionPlace.current = site.place;
    shake.current = { on: true, sum: 0, n: 0 };
    tapsRef.current = 1;
    setTaps(1);
    setRemaining(TAP_DURATION_SEC);
    spawnFlame();
    setPhase({ kind: 'tapping' });
  };

  const busy = phase.kind === 'tapping' || phase.kind === 'sending';
  const fabActive = busy || (site.status === 'ok' && cooldownLeft <= 0);
  const fabLabel = busy
    ? '열기'
    : site.status === 'no-location'
      ? '위치 꺼짐'
      : site.status === 'locating'
        ? '위치 확인'
        : site.status === 'choose'
          ? '장소 선택'
          : site.status === 'off-site'
            ? '현장 밖'
            : cooldownLeft > 0
              ? fmtLeft(cooldownLeft)
              : '열기';

  const chipCls = 'inline-flex h-[33px] items-center rounded-2xl bg-[#FFF1CF] px-3 text-[11px] font-medium leading-[15px] text-[#B7392D]';

  return (
    <>
      <div className="pointer-events-none flex items-end justify-between gap-2 pl-[22px] pr-[25px]">
        <div className="flex min-w-0 flex-col items-start gap-[13px] pb-2.5">
          {/* 현장 인증 칩 */}
          {site.status === 'choose' && phase.kind === 'idle' ? (
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
              <span className={chipCls}>여기 맞나요?</span>
              {site.candidates.slice(0, 3).map(c => (
                <button key={c.id} type="button" onClick={() => onChoose(c.id)} className="h-[33px] rounded-2xl border border-[#E9E2DA] bg-white px-3 text-[11px] font-bold text-[#282522]">
                  {c.name} <span className="font-normal text-[#766F69]">{c.distanceM}m</span>
                </button>
              ))}
            </div>
          ) : shownPlace && (busy || phase.kind === 'done' || site.status === 'ok') ? (
            <span className={chipCls}>
              ✓ {shownPlace.name} · {phase.kind === 'done' ? '참여 완료' : '현장 인증'}
            </span>
          ) : site.status === 'locating' ? (
            <span className={chipCls}>위치 확인 중… (오차 {site.accuracyM}m · {GPS_MAX_ACCURACY_M}m 이하 필요)</span>
          ) : null}

          {/* 10초 집계 / 완료 / 오류 카드 */}
          {busy && (
            <div className="w-[231px] rounded-[15px] border border-[#E9E2DA] bg-white px-[15px] pb-3 pt-[5px]" aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="text-[26px] font-bold leading-9 tabular-nums text-[#282522]">00:{String(Math.ceil(remaining)).padStart(2, '0')}</span>
                <span className="text-[17px] font-bold leading-6 tabular-nums text-[#E64B3B]">🔥 {taps}회</span>
              </div>
              <p className="mt-1 text-xs leading-[17px] text-[#766F69]">
                {phase.kind === 'sending' ? '열기를 보내는 중…' : taps >= MAX_TAPS ? '최대로 눌렀어요! 흔들어도 올라가요' : '반응을 누르면 불꽃이 올라가요!'}
              </p>
            </div>
          )}
          {phase.kind === 'done' && (
            <div className="w-[327px] max-w-full rounded-[14px] border border-[#E9E2DA] bg-white px-[13px] pb-2.5 pt-2" aria-live="polite">
              <p className="text-lg font-bold leading-[25px] text-[#282522]">🔥 열기를 전했어요!</p>
              <p className="mt-2 text-xs leading-[17px] text-[#766F69]">
                +{phase.result.delta.toFixed(1)}° · 지금 {phase.result.peers}명이 함께 · 지도는 5초마다 갱신
              </p>
            </div>
          )}
          {phase.kind === 'error' && (
            <div className="w-[327px] max-w-full rounded-[14px] border border-[#E9E2DA] bg-white px-[13px] pb-2.5 pt-2" role="alert">
              <p className="text-base font-bold leading-6 text-[#282522]">열기를 올리지 못했어요</p>
              <p className="mt-1 text-xs leading-[17px] text-[#766F69]">{phase.message}</p>
            </div>
          )}
          {phase.kind === 'tapping' && (
            <span className="inline-flex h-[33px] items-center rounded-2xl bg-white px-3 text-[11px] font-medium leading-[15px] text-[#766F69]">📱 흔들어도 열기가 올라가요</span>
          )}
        </div>

        <div className="pointer-events-auto relative mb-2.5 shrink-0">
          {/* 떠오르는 불꽃 */}
          {flames.map(f => (
            <span
              key={f.id}
              className="flame-float pointer-events-none absolute left-[38px] top-3 text-2xl leading-[34px] text-[#E64B3B] opacity-95"
              style={{ ['--dx' as string]: `${f.dx}px`, ['--s' as string]: f.s }}
              aria-hidden="true"
            >
              🔥
            </span>
          ))}
          <HeatFab active={fabActive} label={fabLabel} onPress={press} ringKey={ringKey} />
        </div>
      </div>

      {daefrica && <div className="daefrica-mode pointer-events-none fixed inset-0 z-50 opacity-60" aria-hidden="true" />}
    </>
  );
}
