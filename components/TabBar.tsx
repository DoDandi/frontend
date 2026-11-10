import type { Icon } from '@phosphor-icons/react';
import { ImagesSquare, MapTrifold, UserCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

/** 하단 탭 (피그마 하단 내비게이션): 지도 · 피드 · MY */
export default function TabBar({ active }: { active: 'map' | 'feed' | 'me' }) {
  const tab = (Icon: Icon, label: string, on: boolean, href?: string) => {
    const cls = `flex h-[60px] w-[130px] flex-col items-center justify-center ${on ? 'text-[#B7392D]' : href ? 'text-[#766F69]' : 'text-[#C9C3BD]'}`;
    const body = (
      <>
        <Icon size={24} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
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
      {tab(MapTrifold, '지도', active === 'map', '/')}
      {tab(ImagesSquare, '피드', active === 'feed', '/feed')}
      {tab(UserCircle, 'MY', active === 'me', '/me')}
    </nav>
  );
}
