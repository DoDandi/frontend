export type LatLng = { lat: number; lng: number };

const R_EARTH_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** 하버사인 거리 (미터) */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.sqrt(h));
}

export type OnSite = { ok: true; distanceM: number } | { ok: false; reason: 'LOW_ACCURACY' | 'TOO_FAR'; distanceM: number };

/** 현장 인증 (백엔드와 같은 규칙): 오차가 maxAccuracy 이하이고 "측정 거리 − 오차"가 반경 안이면 인증 */
export function checkOnSite(distance: number, accuracy: number, radius: number, maxAccuracy: number): OnSite {
  const distanceM = Math.round(distance);
  if (!(accuracy >= 0) || accuracy > maxAccuracy) return { ok: false, reason: 'LOW_ACCURACY', distanceM };
  return distance - accuracy <= radius ? { ok: true, distanceM } : { ok: false, reason: 'TOO_FAR', distanceM };
}

/**
 * 화면 범위를 요청용 범위로: 사방 25% 넓히고 0.005°(약 500m) 격자에 맞춰 바깥으로 반올림.
 * 조금 움직여서는 범위가 그대로라 다시 요청하지 않고, 화면 가장자리 마커도 미리 받아 둔다.
 */
export function requestBbox([w, s, e, n]: [number, number, number, number]): string {
  const padX = (e - w) * 0.25;
  const padY = (n - s) * 0.25;
  const step = 0.005;
  const down = (v: number) => (Math.floor(v / step) * step).toFixed(3);
  const up = (v: number) => (Math.ceil(v / step) * step).toFixed(3);
  return [down(w - padX), down(s - padY), up(e + padX), up(n + padY)].join(',');
}

/** 내 위치 주변 범위 (현장 인증·반경 밖 안내용). 기본 약 ±600m */
export function aroundBbox(p: { lat: number; lng: number }, d = 0.006): string {
  return [p.lng - d, p.lat - d, p.lng + d, p.lat + d].map(v => v.toFixed(3)).join(',');
}

/** 범위 a("서,남,동,북")가 범위 b를 완전히 덮는지 */
export function bboxContains(a: string, b: string): boolean {
  const [aw, as, ae, an] = a.split(',').map(Number);
  const [bw, bs, be, bn] = b.split(',').map(Number);
  return aw <= bw && as <= bs && ae >= be && an >= bn;
}
