'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { MapOverlay } from '@/components/HeatMarker';
import KakaoMap from '@/components/KakaoMap';
import { fetcher } from '@/components/PlaceSheet';
import { getDeviceId } from '@/lib/device';
import { formatKST } from '@/lib/time';

type Footprint = { placeId: string; name: string; lat: number; lng: number; count: number; lastAt: string };

export default function MePage() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => setDeviceId(getDeviceId()), []);
  const { data } = useSWR<Footprint[]>(deviceId ? `/api/me/footprints?deviceId=${deviceId}` : null, fetcher);

  return (
    <main className="min-h-dvh bg-slate-50 pb-10">
      <header className="px-5 pb-4 pt-[max(env(safe-area-inset-top),20px)]">
        <Link href="/" className="text-sm text-slate-500">
          ← 지도
        </Link>
        <h1 className="mt-3 text-2xl font-black text-slate-900">내 열기 발자국</h1>
        <p className="mt-1 text-slate-600">
          지금까지 <b className="text-red-500">{data?.length ?? 0}곳</b>에서 열기를 올렸어요
        </p>
      </header>

      <KakaoMap className="mx-4 h-56 overflow-hidden rounded-2xl" level={5}>
        {data?.map(f => (
          <MapOverlay key={f.placeId} lat={f.lat} lng={f.lng}>
            <div className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-xs font-bold text-white shadow">
              {f.count}
            </div>
          </MapOverlay>
        ))}
      </KakaoMap>

      <ul className="mx-4 mt-4 divide-y rounded-2xl bg-white">
        {data?.length === 0 && <li className="p-5 text-center text-sm text-slate-500">아직 열기를 올린 곳이 없어요</li>}
        {data?.map(f => (
          <li key={f.placeId} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold text-slate-900">{f.name}</div>
              <div className="text-xs text-slate-500">
                마지막 {formatKST(f.lastAt, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
            <span className="text-sm font-bold text-red-500">{f.count}회</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
