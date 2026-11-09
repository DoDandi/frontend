import { BAND_LABEL, type Band } from '@/lib/temperature';
import { BAND_STYLE } from './HeatMarker';

const ORDER: Band[] = ['mild', 'warm', 'hot', 'daefrica'];

/** 지도 위 범례: 서늘 · 따뜻 · 폭염 · 대프리카 */
export default function BandLegend() {
  return (
    <div className="flex h-8 items-center gap-2.5 rounded-2xl bg-white px-3 text-[11px] font-medium text-[#766F69]">
      {ORDER.map(b => (
        <span key={b} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAND_STYLE[b].color }} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}
