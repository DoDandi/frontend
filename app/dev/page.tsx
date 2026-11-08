'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/components/PlaceSheet';
import { getDeviceId } from '@/lib/device';

type PlaceItem = { id: string; name: string; lat: number; lng: number; temp: number; band: string };

// M3 테스트용: 장소 좌표(또는 200m 떨어진 좌표)로 POST /api/heat
export default function DevPage() {
  const { data: places, mutate } = useSWR<PlaceItem[]>('/api/places', fetcher, { refreshInterval: 5000 });
  const [placeId, setPlaceId] = useState('');
  const [log, setLog] = useState<string[]>([]);

  async function send(offsetM: number) {
    const p = places?.find(x => x.id === placeId);
    if (!p) return;
    const res = await fetch('/api/heat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: p.id,
        deviceId: getDeviceId(),
        lat: p.lat + offsetM / 111_000, // 위도 1도 ≈ 111km
        lng: p.lng,
        taps: 40,
        shake: 1,
      }),
    });
    const body = await res.json();
    setLog(l => [`${res.status} ${JSON.stringify(body)}`, ...l]);
    mutate();
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">/dev 열기 테스트</h1>
      <select className="w-full rounded border p-2" value={placeId} onChange={e => setPlaceId(e.target.value)}>
        <option value="">장소 선택</option>
        {places?.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.temp}°C ({p.band})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => send(0)} className="rounded bg-red-500 p-3 font-bold text-white">
          장소 좌표로 올리기
        </button>
        <button type="button" onClick={() => send(200)} className="rounded bg-slate-200 p-3 font-bold">
          200m 떨어져서 올리기
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-green-300">{log.join('\n') || '결과가 여기에 표시됩니다'}</pre>
    </main>
  );
}
