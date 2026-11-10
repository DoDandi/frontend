'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { finishSignIn } from '@/lib/auth';

/** 카카오 로그인 후 돌아오는 곳. 세션을 만든 뒤 원래 보던 화면으로 보낸다 */
function Callback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const raw = sp.get('next') ?? '/me';
    // 이 앱 안의 경로만 (//다른사이트 같은 주소로 보내지 않게)
    const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/me';
    finishSignIn().then(ok => (ok ? router.replace(next) : setFailed(true)));
  }, [router, sp]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white p-6 text-center text-sm text-[#766F69]">
      {failed ? (
        <>
          <p>로그인하지 못했어요. 다시 시도해 주세요.</p>
          <button type="button" onClick={() => router.replace('/me')} className="rounded-[10px] border border-[#E9E2DA] px-3 py-1.5 text-xs font-bold text-[#B33E29]">
            MY로 가기
          </button>
        </>
      ) : (
        <p>로그인하는 중…</p>
      )}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
