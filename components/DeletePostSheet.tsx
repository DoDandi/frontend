'use client';

import { Trash } from '@phosphor-icons/react/dist/ssr';
import { useRef, useState } from 'react';
import SheetGrip from './SheetGrip';
import { authHeaders } from '@/lib/auth';
import { timeAgo, type Post } from '@/lib/posts';

/** 내 글 관리 시트 (피그마 SCREEN 21). 삭제하면 onDeleted */
export default function DeletePostSheet({ post, onClose, onDeleted }: { post: Post; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/posts/${post.id}`, { method: 'DELETE', headers: await authHeaders() });
      if (r.ok || r.status === 404) return onDeleted();
      setError(r.status === 401 ? '다시 로그인해 주세요' : r.status === 403 ? '내가 쓴 글만 지울 수 있어요' : '지우지 못했어요. 잠시 후 다시 시도해 주세요');
    } catch {
      setError('네트워크 연결을 확인해 주세요');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="backdrop-in fixed inset-0 z-50 flex flex-col justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="내 글 관리">
      <button type="button" className="flex-1" onClick={onClose} aria-label="닫기" />
      <div ref={sheetRef} className="sheet-in relative rounded-t-3xl bg-white px-[22px] pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5">
        <SheetGrip sheetRef={sheetRef} onDismiss={onClose} />
        <p className="mt-4 text-[17px] font-bold text-[#282522]">내 글 관리</p>
        <p className="mt-1 text-xs text-[#766F69]">
          {post.placeName} · {timeAgo(post.createdAt)}에 올린 글
        </p>
        <button type="button" onClick={remove} disabled={busy} className="mt-3 flex h-12 w-full items-center gap-3 text-[15px] font-bold text-[#B33E29] disabled:opacity-50">
          <Trash size={20} aria-hidden="true" />
          {busy ? '지우는 중…' : '게시물 삭제'}
        </button>
        <p className="border-t border-[#E9E2DA] pt-3 text-[11px] text-[#766F69]">삭제하면 사진과 글이 모두 사라지고 되돌릴 수 없어요</p>
        {error && <p className="mt-2 text-xs font-medium text-[#B7392D]">{error}</p>}
        <button type="button" onClick={onClose} className="mt-3 h-[52px] w-full rounded-xl border border-[#E9E2DA] text-[15px] font-bold text-[#282522]">
          취소
        </button>
      </div>
    </div>
  );
}
