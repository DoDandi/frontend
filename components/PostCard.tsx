/* eslint-disable @next/next/no-img-element -- 사용자 업로드 사진(Supabase Storage)이라 next/image 도메인 설정 없이 그대로 쓴다 */
import { DotsThree, ImageSquare, User } from '@phosphor-icons/react/dist/ssr';
import { avatarColor, timeAgo, type Post } from '@/lib/posts';

/** 피드 게시글 카드 (피그마 SCREEN 07 · 피드 / 게시글) */
export default function PostCard({ post, onMore }: { post: Post; /** 내 글이면 ⋯ 메뉴 (SCREEN 21) */ onMore?: () => void }) {
  return (
    <article className="rounded-2xl border border-[#E9E2DA] bg-white px-[14px] pb-4 pt-3">
      <header className="flex items-center gap-[10px] pl-px">
        {post.author.avatarUrl ? (
          <img src={post.author.avatarUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-medium leading-[23px] text-[#766F69]"
            style={{ backgroundColor: avatarColor(post.author.nickname) }}
            aria-hidden="true"
          >
            <User size={18} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-[19px] text-[#282522]">
            {post.author.nickname}
            {post.mine ? ' (나)' : ''}
          </p>
          <p className="mt-1 truncate text-[11px] leading-4 text-[#766F69]">
            {post.placeName} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {onMore && (
          <button type="button" onClick={onMore} className="-mr-1 shrink-0 px-2 py-1 text-lg font-bold leading-none tracking-widest text-[#766F69]" aria-label="내 글 관리">
            <DotsThree size={22} weight="bold" aria-hidden="true" />
          </button>
        )}
      </header>

      {post.imageUrl ? (
        <img src={post.imageUrl} alt={`${post.placeName}에서 남긴 사진`} className="mt-3 aspect-[324/171] w-full rounded-xl bg-[#F6F4F1] object-cover" />
      ) : (
        <div className="mt-3 flex aspect-[324/171] w-full flex-col items-center justify-center rounded-xl bg-[#F6F4F1] text-[#766F69]">
          <span className="text-[32px] leading-[46px]" aria-hidden="true">
            <ImageSquare size={32} aria-hidden="true" />
          </span>
          <span className="mt-4 text-xs font-medium leading-[17px]">현장의 사진</span>
        </div>
      )}

      {post.text && <p className="mt-4 whitespace-pre-wrap break-words px-0.5 text-[13px] leading-[19px] text-[#282522]">{post.text}</p>}
    </article>
  );
}
