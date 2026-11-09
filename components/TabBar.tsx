import Link from 'next/link';

/** 하단 탭: 지도 · 피드 · MY. 피드는 아직 화면이 없어 비활성 */
export default function TabBar({ active }: { active: 'map' | 'me' }) {
  const on = 'font-bold text-[#B4431F]';
  const off = 'text-gray-600';
  return (
    <nav className="flex h-16 shrink-0 items-center justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] text-[11px]">
      <Link href="/" className={`px-6 py-3 ${active === 'map' ? on : off}`}>
        지도
      </Link>
      <span className="px-6 py-3 text-gray-300" aria-disabled="true" title="준비 중">
        피드
      </span>
      <Link href="/me" className={`px-6 py-3 ${active === 'me' ? on : off}`}>
        MY
      </Link>
    </nav>
  );
}
