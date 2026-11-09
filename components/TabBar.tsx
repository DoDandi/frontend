import Link from 'next/link';

/** 하단 탭 (피그마 하단 내비게이션): 지도 · 피드 · MY. 피드는 아직 화면이 없어 비활성 */
export default function TabBar({ active }: { active: 'map' | 'me' }) {
  const tab = (glyph: string, label: string, on: boolean, href?: string) => {
    const cls = `flex h-[60px] w-[130px] flex-col items-center justify-center ${on ? 'text-[#B7392D]' : href ? 'text-[#766F69]' : 'text-[#C9C3BD]'}`;
    const body = (
      <>
        <span className="h-[26px] text-[23px] font-medium leading-[26px]" aria-hidden="true">
          {glyph}
        </span>
        <span className={`text-xs leading-[17px] ${on ? 'font-bold' : 'font-normal'}`}>{label}</span>
      </>
    );
    return href ? (
      <Link href={href} className={cls}>
        {body}
      </Link>
    ) : (
      <span className={cls} aria-disabled="true" title="준비 중">
        {body}
      </span>
    );
  };
  return (
    <nav className="flex h-[73px] shrink-0 items-center justify-center border-t border-[#E9E2DA] bg-white pb-[env(safe-area-inset-bottom)] text-center">
      {tab('⌖', '지도', active === 'map', '/')}
      {tab('▦', '피드', false)}
      {tab('◯', 'MY', active === 'me', '/me')}
    </nav>
  );
}
