'use client';

/* eslint-disable @next/next/no-img-element -- 고른 사진 미리보기(blob URL) */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher, type PlaceDetail } from '@/components/PlaceSheet';
import { getDeviceId } from '@/lib/device';
import { POST_TEXT_MAX, resizeImage } from '@/lib/posts';

/** 현장 기록 남기기 (피그마 SCREEN 08). 장소 상세에서 placeId를 받아 들어온다 */
function NewPost() {
  const router = useRouter();
  const placeId = useSearchParams().get('placeId');
  const { data: place, error: placeError } = useSWR<PlaceDetail>(placeId ? `/api/places/${placeId}` : null, fetcher);

  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    try {
      const blob = await resizeImage(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setMessage('이 사진은 열 수 없어요. 다른 사진을 골라 주세요.');
    }
  };

  const canSubmit = !!placeId && !!place && !!photo && text.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit || !photo) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append('image', photo, 'photo.jpg');
    form.append('text', text.trim());
    form.append('deviceId', getDeviceId());
    try {
      const r = await fetch(`/api/places/${placeId}/photos`, { method: 'POST', body: form });
      if (r.ok) {
        router.push('/feed');
        return;
      }
      setMessage(
        r.status === 401
          ? '글을 올리려면 카카오 로그인이 필요해요.'
          : r.status === 403
            ? '이 장소를 방문한 사람만 글을 남길 수 있어요.'
            : r.status === 404
              ? '게시 기능은 아직 준비 중이에요. (게시물 API 연결 전)'
              : r.status === 413
                ? '사진이 너무 커요. 다른 사진을 골라 주세요.'
                : '올리지 못했어요. 잠시 뒤 다시 시도해 주세요.'
      );
    } catch {
      setMessage('네트워크 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white px-[21px] pb-[max(env(safe-area-inset-bottom),19px)] pt-[max(env(safe-area-inset-top),49px)] text-[#282522]">
      <header className="-ml-1 flex h-[42px] items-center gap-1.5">
        <button type="button" onClick={() => router.back()} className="w-7 text-2xl leading-[35px]" aria-label="뒤로">
          ←
        </button>
        <h1 className="text-[22px] font-bold leading-8">현장 기록 남기기</h1>
      </header>

      <section className="mt-[6px]">
        <h2 className="text-base font-bold leading-[23px]">어디에서 남기는 순간인가요?</h2>
        <div className="mt-[11px] flex h-[61px] flex-col justify-center rounded-[14px] bg-[#F6F4F1] px-4">
          {!placeId || placeError ? (
            <p className="text-sm text-[#766F69]">
              장소를 먼저 골라 주세요.{' '}
              <Link href="/" className="font-bold text-[#B7392D] underline">
                지도로 가기
              </Link>
            </p>
          ) : (
            <>
              <p className="truncate text-[15px] font-bold leading-[22px]">📍 {place?.name ?? '불러오는 중…'}</p>
              <p className="text-[11px] leading-4 text-[#766F69]">열기 지도에서 선택된 장소</p>
            </>
          )}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="text-base font-bold leading-[23px]">현장 사진</h2>
        <input ref={fileInput} id="post-photo" type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="relative mt-[11px] flex h-[225px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-[#F6F4F1] text-[#766F69]"
          aria-label={photo ? '사진 바꾸기' : '사진 추가하기'}
        >
          {preview ? (
            <>
              <img src={preview} alt="고른 사진 미리보기" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">사진 바꾸기</span>
            </>
          ) : (
            <>
              <span className="mt-[22px] text-[32px] leading-[46px]" aria-hidden="true">
                ▧
              </span>
              <span className="mt-[45px] text-xs font-medium leading-[17px]">+ 사진 추가하기</span>
            </>
          )}
        </button>
      </section>

      <section className="mt-[27px]">
        <label htmlFor="post-text" className="block text-base font-bold leading-[23px]">
          이 순간을 소개해 주세요
        </label>
        <textarea
          id="post-text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, POST_TEXT_MAX))}
          placeholder={'지금 어떤 순간을 보내고 있나요?\n현장의 열기를 글로 남겨주세요.'}
          className="mt-[11px] h-[120px] w-full resize-none rounded-[14px] border border-[#E9E2DA] bg-[#F6F4F1] px-4 py-[14px] text-sm leading-5 outline-none placeholder:text-[#766F69] focus:border-[#B7392D]"
        />
        <p className="mt-1 text-right text-[11px] tabular-nums text-[#766F69]">
          {text.length}/{POST_TEXT_MAX}
        </p>
      </section>

      <div className="mt-auto pt-3">
        {message && <p className="mb-2 text-center text-xs font-medium text-[#B7392D]">{message}</p>}
        <p className="mx-1.5 flex h-8 items-center justify-center rounded-2xl bg-[#F6F4F1] text-[11px] font-medium leading-4 text-[#766F69]">
          이 장소를 방문한 사람들이 볼 수 있어요
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-[21px] h-[52px] w-full rounded-[14px] bg-[#B7392D] text-base font-bold leading-[23px] text-white disabled:opacity-40"
        >
          {busy ? '올리는 중…' : '사진과 글 게시하기'}
        </button>
      </div>
    </main>
  );
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPost />
    </Suspense>
  );
}
