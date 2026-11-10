'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { COOLDOWN_MIN, GPS_MAX_ACCURACY_M, MAX_TAPS, TAP_DURATION_SEC } from '@/lib/constants';
import { getDeviceId } from '@/lib/device';
import HeatFab from './HeatFab';

export type Fix = { lat: number; lng: number; accuracy: number };
export type SiteState =
  | { status: 'no-location' }
  | { status: 'locating'; accuracyM: number }
  | { status: 'off-site' }
  | { status: 'choose'; candidates: { id: string; name: string; distanceM: number }[] }
  | { status: 'ok'; place: { id: string; name: string } };

export type HeatApiResult = { tempBefore: number; tempAfter: number; delta: number; peers: number };
type Phase = { kind: 'idle' } | { kind: 'tapping' } | { kind: 'sending' } | { kind: 'error'; message: string };

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
 * 첫 터치로 10초가 시작되고, 그동안 누른 횟수를 센 뒤 POST /api/heat.
 */
export default function HeatSession({
  site,
  fixRef,
  onChoose,
  onToast,
  onSent,
  onOffSite,
  onNoLocation,
  suggest,
  onSuggest,
}: {
  site: SiteState;
  fixRef: RefObject<Fix | null>;
  onChoose: (placeId: string) => void;
  onToast: (msg: string) => void;
  /** 성공하면 결과를 넘긴다. 결과 시트(SCREEN 13)·대프리카(14)는 페이지가 그린다 */
  onSent: (result: HeatApiResult, placeId: string) => void;
  /** 현장 밖에서 누르면 반경 밖 안내(SCREEN 20)를 연다 */
  onOffSite: () => void;
  /** 위치를 못 받았을 때 (위치 권한 안내 카드, SCREEN 22) */
  onNoLocation: () => void;
  /** 쿨다운 중에 추천할 다른 장소 (SCREEN 19) */
  suggest: { id: string; name: string; temp: number } | null;
  onSuggest: (placeId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [taps, setTaps] = useState(0);
  const [remaining, setRemaining] = useState(TAP_DURATION_SEC);
  const [flames, setFlames] = useState<{ id: number; dx: number; s: number }[]>([]);
  const [ringKey, setRingKey] = useState(0);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [cooldownCard, setCooldownCard] = useState(false);

  const tapsRef = useRef(0);
  const sessionPlace = useRef<{ id: string; name: string } | null>(null);
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

  const send = useCallback(async () => {
    const target = sessionPlace.current;
    const fix = fixRef.current;
    if (!target) return;
    setPhase({ kind: 'sending' });
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
          shake: null, // 흔들기는 쓰지 않는다 (11/10 결정): 연타만으로 점수
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setCooldown(target.id, Date.now() + COOLDOWN_MIN * 60_000);
        setPhase({ kind: 'idle' });
        onSent(body, target.id);
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

  // 쿨다운 안내 카드는 잠시 보여 주고 닫는다
  useEffect(() => {
    if (!cooldownCard) return;
    const t = setTimeout(() => setCooldownCard(false), 6000);
    return () => clearTimeout(t);
  }, [cooldownCard]);
  useEffect(() => {
    if (cooldownLeft <= 0) setCooldownCard(false);
  }, [cooldownLeft]);

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
    if (phase.kind !== 'error') return;
    const t = setTimeout(() => setPhase({ kind: 'idle' }), 4500);
    return () => clearTimeout(t);
  }, [phase]);

  const spawnFlame = () => {
    const id = ++flameId.current;
    setFlames(f => [...f.slice(-24), { id, dx: Math.round((Math.random() - 0.5) * 90), s: 0.7 + Math.random() * 0.6 }]);
    setTimeout(() => setFlames(f => f.filter(x => x.id !== id)), 1400);
    setRingKey(k => k + 1);
  };

  const press = () => {
    if (phase.kind === 'tapping') {
      tapsRef.current += 1;
      setTaps(tapsRef.current);
      spawnFlame();
      return;
    }
    if (phase.kind === 'sending') return;
    if (site.status === 'off-site') {
      onOffSite();
      return;
    }
    if (site.status === 'no-location') {
      onNoLocation();
      return;
    }
    if (site.status !== 'ok') {
      onToast(
        site.status === 'locating'
            ? `위치 오차가 커요 (${site.accuracyM}m). 하늘이 보이는 곳에서 잠시 기다려 주세요`
            : site.status === 'choose'
              ? '어느 장소인지 먼저 골라 주세요'
              : '장소 가까이에서만 열기를 올릴 수 있어요'
      );
      return;
    }
    if (cooldownLeft > 0) {
      setCooldownCard(true);
      return;
    }
    // 첫 터치: 10초 시작
    sessionPlace.current = site.place;
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
          ) : shownPlace && (busy || site.status === 'ok') ? (
            <span className={chipCls}>✓ {shownPlace.name} · 현장 인증</span>
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
                {phase.kind === 'sending' ? '열기를 보내는 중…' : taps >= MAX_TAPS ? '최대로 눌렀어요!' : '반응을 누르면 불꽃이 올라가요!'}
              </p>
            </div>
          )}
          {cooldownCard && place && cooldownLeft > 0 && (
            <div className="pointer-events-auto w-[260px] max-w-full rounded-[15px] border border-[#E9E2DA] bg-white px-4 pb-3 pt-3" aria-live="polite">
              <p className="text-[15px] font-bold text-[#282522]">⏳ 잠시 쉬어 가요</p>
              <p className="mt-1.5 text-[11px] leading-4 text-[#766F69]">
                {place.name}에는 방금 열기를 올렸어요.
                <br />
                같은 장소는 {COOLDOWN_MIN}분 후 다시 올릴 수 있어요.
              </p>
              <p className="mt-2 text-[30px] font-bold leading-9 tabular-nums text-[#D94B35]">
                {fmtLeft(cooldownLeft).padStart(5, '0')} <span className="text-xs font-medium text-[#766F69]">남음</span>
              </p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#F6F4F1]">
                <span className="block h-full rounded-full bg-[#D94B35]" style={{ width: `${(1 - cooldownLeft / (COOLDOWN_MIN * 60_000)) * 100}%` }} />
              </span>
              {suggest && (
                <button type="button" onClick={() => onSuggest(suggest.id)} className="mt-2.5 text-left text-[11px] font-medium text-[#B7392D]">
                  그동안 다른 곳은 어때요? {suggest.name} {Math.round(suggest.temp)}° ›
                </button>
              )}
            </div>
          )}
          {phase.kind === 'error' && (
            <div className="w-[327px] max-w-full rounded-[14px] border border-[#E9E2DA] bg-white px-[13px] pb-2.5 pt-2" role="alert">
              <p className="text-base font-bold leading-6 text-[#282522]">열기를 올리지 못했어요</p>
              <p className="mt-1 text-xs leading-[17px] text-[#766F69]">{phase.message}</p>
            </div>
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

    </>
  );
}
