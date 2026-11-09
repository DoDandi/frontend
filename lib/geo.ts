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
