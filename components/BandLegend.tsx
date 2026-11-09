import { BAND_LABEL, type Band } from '@/lib/temperature';
import { BAND_STYLE } from './HeatMarker';

const ORDER: Band[] = ['mild', 'warm', 'hot', 'daefrica'];

/** 지도 위 범례: 서늘 · 따뜻 · 폭염 · 대프리카 */
export default function BandLegend() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/95 px-2.5 py-1.5 text-[10px] text-gray-700 shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
      {ORDER.map(b => (
        <span key={b} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAND_STYLE[b].color }} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}
