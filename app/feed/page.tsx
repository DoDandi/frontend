'use client';

import { useState } from 'react';
import useSWR from 'swr';
import DeletePostSheet from '@/components/DeletePostSheet';
import FilterChips from '@/components/FilterChips';
import PostCard from '@/components/PostCard';
import StateCard from '@/components/StateCard';
import TabBar from '@/components/TabBar';
import { authHeaders, useAuth } from '@/lib/auth';
import { POLL_MS, type Group } from '@/lib/constants';
import { samplePosts, type Post } from '@/lib/posts';

/** 피드 API가 아직 없으면(404) 예시 게시물로 화면을 보여 준다 */
async function loadFeed([url]: [string, string]): Promise<{ posts: Post[]; sample: boolean }> {
  // 로그인했으면 토큰을 붙여 내 글(mine)을 표시받는다
  const r = await fetch(url, { headers: await authHeaders() });
  if (r.status === 404) {
    const group = new URL(url, 'http://x').searchParams.get('group') as Group | null;
    return { posts: samplePosts(group), sample: true };
  }
  if (!r.ok) throw new Error(`${r.status}`);
  return { posts: await r.json(), sample: false };
}

export default function FeedPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [managing, setManaging] = useState<Post | null>(null);
  const { user, loading: authLoading } = useAuth();

  // 로그인 상태를 알게 된 뒤에 부른다 (로그인/로그아웃하면 다시 불러 mine이 바뀐다)
  const { data, error, isLoading, mutate } = useSWR(
    authLoading ? null : ([`/api/feed${group ? `?group=${group}` : ''}`, user?.id ?? ''] as [string, string]),
    loadFeed,
    { refreshInterval: POLL_MS * 6 }
  );

  const term = q.trim().replace(/\s+/g, '').toLowerCase();
  const posts = data?.posts.filter(
    p => !term || p.placeName.replace(/\s+/g, '').toLowerCase().includes(term) || p.text.replace(/\s+/g, '').toLowerCase().includes(term)
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-white text-[#282522]">
      <header className="flex shrink-0 flex-col px-[17px] pb-2 pt-[max(env(safe-area-inset-top),49px)]">
        <div className="flex h-[42px] items-center justify-between pl-1.5">
          <h1 className="text-[22px] font-bold leading-8">현장의 순간</h1>
          <button
            type="button"
            onClick={() => {
              setSearching(s => !s);
              setQ('');
            }}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F6F4F1] text-[21px] font-medium leading-[30px]"
            aria-label={searching ? '검색 닫기' : '게시글 검색'}
          >
            {searching ? '×' : '⌕'}
          </button>
        </div>
        {searching && (
          <input
            id="feed-search"
            type="search"
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="장소 이름이나 내용으로 찾기"
            className="mt-2 h-10 rounded-full bg-[#F6F4F1] px-4 text-sm outline-none focus:ring-2 focus:ring-[#B7392D]/40"
          />
        )}
        <div className="mt-[13px]">
          <FilterChips value={group} onChange={setGroup} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-[17px] pb-4 pt-[9px]">
        {data?.sample && (
          <p className="mb-3 rounded-full bg-[#F6F4F1] py-1.5 text-center text-[11px] font-medium text-[#766F69]">
            예시 게시물이에요 · 게시물 API가 준비되면 실제 글이 보여요
          </p>
        )}

        {isLoading || (!data && !error) ? (
          <p className="py-16 text-center text-sm text-[#766F69]">불러오는 중…</p>
        ) : error ? (
          <StateCard tone="error" icon="🔧" title="잠시 문제가 생겼어요" body="잠시 후 다시 시도해 주세요" action={{ label: '새로고침', onClick: () => mutate() }} />
        ) : posts && posts.length === 0 ? (
          term ? (
            <StateCard icon="🔍" title={`‘${q.trim()}’에 맞는 게시글이 없어요`} body="다른 장소 이름이나 낱말로 찾아 보세요" />
          ) : (
            <StateCard icon="🍃" title="아직 남겨진 순간이 없어요" body="지도에서 장소를 골라 첫 기록을 남겨 보세요" action={{ label: '지도 보기', href: '/' }} />
          )
        ) : (
          <div className="flex flex-col gap-[15px]">
            {posts?.map(p => (
              <PostCard key={p.id} post={p} onMore={p.mine ? () => setManaging(p) : undefined} />
            ))}
          </div>
        )}
      </div>

      <TabBar active="feed" />

      {managing && (
        <DeletePostSheet
          post={managing}
          onClose={() => setManaging(null)}
          onDeleted={() => {
            setManaging(null);
            mutate();
          }}
        />
      )}
    </main>
  );
}
