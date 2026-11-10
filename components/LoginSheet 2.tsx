'use client';

import { useState } from 'react';
import { signInWithKakao } from '@/lib/auth';

/** 로그인 필요 안내 시트 (피그마 SCREEN 16). 로그인 후 next(지금 화면)로 돌아온다 */
export default function LoginSheet({ next, onClose }: { next: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="로그인 필요">
      <button type="button" className="flex-1" onClick={onClose} aria-label="닫기" />
      <div className="rounded-t-3xl bg-white px-[22px] pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5">
        <div className="mx-auto h-1 w-11 rounded-sm bg-[#E9E2DA]" />
        <p className="mt-4 text-[32px] leading-none" aria-hidden="true">
          ✍️
        </p>
        <p className="mt-3 text-xl font-bold text-[#282522]">글을 남기려면 로그인이 필요해요</p>
        <p className="mt-2 text-[13px] leading-5 text-[#766F69]">
          지도 보기, 장소 상세, 피드 보기, 열기 올리기는
          <br />
          로그인 없이 그대로 쓸 수 있어요.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F6F4F1] p-3">
          <span className="h-8 w-8 shrink-0 rounded-full bg-[#F4A48C]" aria-hidden="true" />
          <p className="text-xs text-[#282522]">글에는 카카오 닉네임과 프로필 사진이 표시돼요</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(await signInWithKakao(next));
            setBusy(false);
          }}
          className="mt-4 h-[52px] w-full rounded-xl bg-[#FEE500] text-[15px] font-bold text-[#282522] disabled:opacity-60"
        >
          💬 카카오로 3초 만에 시작하기
        </button>
        {error && <p className="mt-2 text-center text-xs font-medium text-[#B7392D]">{error}</p>}
        <button type="button" onClick={onClose} className="mt-1 h-11 w-full text-sm text-[#766F69]">
          다음에 할게요
        </button>
        <p className="text-center text-[11px] text-[#766F69]">로그인하면 작성 중이던 화면으로 바로 돌아와요</p>
      </div>
    </div>
  );
}
