import type { Category, Group } from './constants';
import { CATEGORY_GROUP } from './constants';

/**
 * 현장 게시물 (사진 1장 + 글). 11/9 피그마 SCREEN 07·08 기준.
 * 백엔드 API (노션 "현재 진행 상황 공유" 9장):
 *  - GET  /api/feed?group=            → Post[] (최신순)
 *  - POST /api/places/[id]/photos     → multipart: image(JPEG), text, deviceId → 201 Post
 */
export type Post = {
  id: string;
  placeId: string;
  placeName: string;
  category: Category;
  author: { nickname: string; avatarUrl: string | null };
  imageUrl: string | null;
  text: string;
  createdAt: string;
};

export const POST_TEXT_MAX = 300;

/** 피드 API가 아직 없을 때(404) 화면 확인용으로 보여 주는 예시. 화면에 "예시"라고 표시한다 */
const SAMPLE_POSTS: Omit<Post, 'createdAt'>[] = [
  { id: 's1', placeId: '', placeName: '교동 먹자골목', category: 'food', author: { nickname: '익명 사용자', avatarUrl: null }, imageUrl: null, text: '지금 여기 분위기가 정말 뜨거워요! 🔥' },
  { id: 's2', placeId: '', placeName: '2.28기념중앙공원', category: 'festival', author: { nickname: '열기 탐험가', avatarUrl: null }, imageUrl: null, text: '응원하는 사람들 덕분에 더 신나는 밤!' },
  { id: 's3', placeId: '', placeName: '서문시장 야시장', category: 'night_market', author: { nickname: '야시장러', avatarUrl: null }, imageUrl: null, text: '줄이 길어도 기다릴 만해요. 납작만두 강추' },
];

export function samplePosts(group: Group | null): Post[] {
  const now = Date.now();
  return SAMPLE_POSTS.map((p, i) => ({ ...p, createdAt: new Date(now - [5, 12, 40][i] * 60_000).toISOString() })).filter(
    p => !group || CATEGORY_GROUP[p.category] === group
  );
}

/** "5분 전" 같은 상대 시간 */
export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 작성자 아바타 배경 (피그마 #FCE8E1 / #FFF1CF 번갈아) */
export function avatarColor(nickname: string): string {
  let h = 0;
  for (const ch of nickname) h = (h + ch.charCodeAt(0)) % 2;
  return h === 0 ? '#FCE8E1' : '#FFF1CF';
}

/**
 * 업로드 전에 긴 변 1280px JPEG로 줄인다. Vercel 요청 한도(4.5MB) 안에 들어가고, 위치 정보(EXIF)도 빠진다.
 */
export async function resizeImage(file: File, maxSide = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('이미지를 변환하지 못했어요'))), 'image/jpeg', quality)
  );
}
