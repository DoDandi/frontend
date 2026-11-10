'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/**
 * 카카오 로그인 (Supabase Auth). 브라우저는 로그인에만 Supabase를 쓰고,
 * 데이터는 지금처럼 /api를 거친다. 로그인한 요청에는 Authorization: Bearer <액세스 토큰>을 붙인다.
 */
let client: SupabaseClient | null | undefined;
function sb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }) : null;
  return client;
}

export type User = { id: string; nickname: string; avatarUrl: string | null };

function toUser(s: Session | null): User | null {
  if (!s) return null;
  const m = s.user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    id: s.user.id,
    nickname: str(m.name) ?? str(m.full_name) ?? str(m.preferred_username) ?? str(m.user_name) ?? '익명 사용자',
    avatarUrl: str(m.avatar_url) ?? str(m.picture),
  };
}

/** 로그인 상태. loading 동안은 로그인 여부를 아직 모른다 */
export function useAuth(): { user: User | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    const c = sb();
    if (!c) {
      setState({ user: null, loading: false });
      return;
    }
    c.auth.getSession().then(({ data }) => setState({ user: toUser(data.session), loading: false }));
    const { data } = c.auth.onAuthStateChange((_e, s) => setState({ user: toUser(s), loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

/** 카카오 로그인 화면으로 보낸다. 끝나면 next(이 앱 안의 경로)로 돌아온다 */
export async function signInWithKakao(next: string): Promise<string | null> {
  const c = sb();
  if (!c) return '로그인 설정이 아직 안 됐어요 (Supabase 키 필요)';
  const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await c.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } });
  return error ? '카카오 로그인을 시작하지 못했어요' : null;
}

export async function signOut() {
  await sb()?.auth.signOut();
}

/** 로그인했으면 Authorization 헤더 */
export async function authHeaders(): Promise<Record<string, string>> {
  const s = (await sb()?.auth.getSession())?.data.session;
  return s ? { Authorization: `Bearer ${s.access_token}` } : {};
}

/** SWR용: 로그인 토큰을 붙여 부른다 */
export const authFetcher = async (url: string) => {
  const r = await fetch(url, { headers: await authHeaders() });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
};

/** 콜백에서 세션이 만들어질 때까지 기다린다 (pkce 코드 교환은 클라이언트가 처음 만들어질 때 한다) */
export async function finishSignIn(): Promise<boolean> {
  const c = sb();
  if (!c) return false;
  const { data } = await c.auth.getSession();
  return !!data.session;
}
