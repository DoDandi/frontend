import Link from 'next/link';

const TONE = {
  empty: 'bg-[#F6F4F1]',
  warn: 'bg-[#FFF1CF]',
  error: 'bg-[#FCE8E1]',
} as const;

type Action = { label: string; href: string } | { label: string; onClick: () => void };

/** 빈 화면·오류 상태 카드 (피그마 SCREEN 22). 각 화면의 해당 영역에 같은 형태로 넣는다 */
export default function StateCard({
  tone = 'empty',
  icon,
  title,
  body,
  action,
}: {
  tone?: keyof typeof TONE;
  icon: string;
  title: string;
  body?: string;
  action?: Action;
}) {
  const btn = 'mt-1 rounded-[10px] border border-[#E9E2DA] bg-white px-3 py-1.5 text-xs font-bold text-[#B33E29]';
  return (
    <div className={`pointer-events-auto flex w-full gap-3 rounded-2xl p-[14px] text-left ${TONE[tone]}`} role={tone === 'empty' ? undefined : 'alert'}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg" aria-hidden="true">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="text-sm font-bold text-[#282522]">{title}</p>
        {body && <p className="text-xs leading-[1.45] text-[#766F69]">{body}</p>}
        {action &&
          ('href' in action ? (
            <Link href={action.href} className={btn}>
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={btn}>
              {action.label}
            </button>
          ))}
      </div>
    </div>
  );
}
