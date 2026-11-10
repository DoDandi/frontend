'use client';

import { useRef, type PointerEvent, type RefObject } from 'react';

/** iOS 서랍과 같은 곡선 (Ionic) */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** 이만큼 끌어내리면 닫는다 (시트 높이의 30%와 140px 중 작은 값) */
const DISMISS_RATIO = 0.3;
const DISMISS_MAX_PX = 140;
/** 짧게 휙 튕겨도 닫는다 (px/ms) */
const FLICK_VELOCITY = 0.11;

/** 놓기 직전 이 시간 안의 움직임으로 속도를 잰다 (꾹 누르고 있다가 튕겨도 튕김으로 인식) */
const VELOCITY_WINDOW_MS = 100;

type Sample = { dy: number; t: number };

/** 놓기 직전 속도 (px/ms, 아래로 +) */
export function releaseVelocity(samples: Sample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const first = samples.find(s => last.t - s.t <= VELOCITY_WINDOW_MS) ?? samples[0];
  return first === last ? 0 : (last.dy - first.dy) / Math.max(1, last.t - first.t);
}

/** 놓았을 때 닫을지: 충분히 끌었거나, 아래로 휙 튕겼거나 */
export function shouldDismiss(dy: number, height: number, velocity: number): boolean {
  return dy > Math.min(DISMISS_MAX_PX, height * DISMISS_RATIO) || (dy > 20 && velocity > FLICK_VELOCITY);
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 하단 시트 손잡이. 아래로 끌거나 휙 튕기면 onDismiss, 그냥 누르면 onTap.
 * sheetRef의 요소를 손가락을 따라 직접 옮긴다 (React 상태를 거치지 않아 끊기지 않음).
 */
export default function SheetGrip({
  sheetRef,
  onDismiss,
  onTap,
  label = '시트 닫기',
}: {
  sheetRef: RefObject<HTMLElement | null>;
  onDismiss?: () => void;
  onTap?: () => void;
  label?: string;
}) {
  const drag = useRef<{ id: number; y: number; dy: number; moved: boolean; samples: Sample[] } | null>(null);
  const justDragged = useRef(false);

  const move = (y: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? `transform ${reducedMotion() ? 0 : 240}ms ${EASE}` : 'none';
    el.style.transform = y ? `translateY(${y}px)` : '';
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current) return; // 두 번째 손가락은 무시
    drag.current = { id: e.pointerId, y: e.clientY, dy: 0, moved: false, samples: [{ dy: 0, t: performance.now() }] };
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // 손가락이 시트 밖으로 나가도 계속 따라가게
    } catch {
      /* 이미 떨어진 포인터면 캡처 없이 진행 */
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const raw = e.clientY - d.y;
    if (!d.moved && Math.abs(raw) < 4) return;
    d.moved = true;
    // 위로 끌면 벽에 막히듯 멈추지 않고 점점 덜 따라오게 (저항)
    d.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2;
    d.samples.push({ dy: d.dy, t: performance.now() });
    if (d.samples.length > 20) d.samples.shift();
    move(d.dy, false);
  };

  const onPointerEnd = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return; // 탭은 onClick이 처리
    justDragged.current = true;
    const height = sheetRef.current?.offsetHeight ?? 300;
    const dismiss = onDismiss && shouldDismiss(d.dy, height, releaseVelocity(d.samples));
    if (dismiss) {
      move(height, true);
      setTimeout(onDismiss, reducedMotion() ? 0 : 200);
    } else {
      move(0, true);
    }
  };

  return (
    <>
      {/* 보이는 손잡이 */}
      <span className="mx-auto block h-1 w-11 shrink-0 rounded-full bg-[#E9E2DA]" aria-hidden="true" />
      {/* 잡는 영역: 시트 위쪽 28px 전체 */}
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          if (justDragged.current) {
            justDragged.current = false;
            return;
          }
          (onTap ?? onDismiss)?.();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="absolute inset-x-0 top-0 h-7 cursor-grab touch-none active:cursor-grabbing"
      />
    </>
  );
}
