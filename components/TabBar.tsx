import Link from 'next/link';

const ICON = {
  map: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  feed: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
    </>
  ),
  me: <circle cx="12" cy="12" r="9" />,
};

function Tab({ icon, label, on, href }: { icon: keyof typeof ICON; label: string; on: boolean; href?: string }) {
  const body = (
    <>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        {ICON[icon]}
      </svg>
      <span>{label}</span>
    </>
  );
  const cls = `flex w-1/3 flex-col items-center gap-1 py-2 ${on ? 'font-bold text-[#B7392D]' : href ? 'text-[#88817C]' : 'text-gray-300'}`;
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <span className={cls} aria-disabled="true" title="준비 중">
      {body}
    </span>
  );
}

/** 하단 탭: 지도 · 피드 · MY. 피드는 아직 화면이 없어 비활성 */
export default function TabBar({ active }: { active: 'map' | 'me' }) {
  return (
    <nav className="flex shrink-0 items-center border-t border-[#E9E2DA] bg-white pb-[env(safe-area-inset-bottom)] text-xs">
      <Tab icon="map" label="지도" on={active === 'map'} href="/" />
      <Tab icon="feed" label="피드" on={false} />
      <Tab icon="me" label="MY" on={active === 'me'} href="/me" />
    </nav>
  );
}
