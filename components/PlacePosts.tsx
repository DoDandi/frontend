'use client';

import useSWR from 'swr';
import { formatKST } from '@/lib/time';

type Posts = {
  images: { thumbnail: string; url: string; source: string }[];
  blogs: { title: string; contents: string; url: string; blogName: string; datetime: string; thumbnail: string | null }[];
  instagramUrl: string;
  naverBlogUrl: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

/** 사람들이 올린 사진·블로그 글 (다음 검색) + 인스타·네이버 바로가기. 썸네일만 보여주고 원문으로 연결한다 */
export default function PlacePosts({ placeId }: { placeId: string }) {
  const { data } = useSWR<Posts>(`/api/places/${placeId}/posts`, fetcher, { revalidateOnFocus: false });
  if (!data) return <div className="mt-5 h-24 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <section className="mt-5">
      <div className="mb-2 text-xs font-semibold text-slate-500">사람들이 남긴 사진과 글</div>

      {data.images.length > 0 && (
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl">
          {data.images.map(img => (
            <a key={img.url + img.thumbnail} href={img.url} target="_blank" rel="noopener noreferrer" className="relative aspect-square bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnail} alt={img.source} loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {data.blogs.length > 0 && (
        <ul className="mt-3 space-y-3">
          {data.blogs.map(b => (
            <li key={b.url}>
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex gap-3">
                {b.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.thumbnail} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{b.title}</div>
                  <div className="line-clamp-2 text-xs text-slate-500">{b.contents}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {b.blogName} · {formatKST(b.datetime, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      {data.images.length === 0 && data.blogs.length === 0 && (
        <p className="text-sm text-slate-400">아직 찾은 사진이나 글이 없어요</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={data.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-orange-400 py-2.5 text-center text-sm font-bold text-white"
        >
          인스타 해시태그
        </a>
        <a
          href={data.naverBlogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-[#03C75A] py-2.5 text-center text-sm font-bold text-white"
        >
          네이버 블로그
        </a>
      </div>
    </section>
  );
}
