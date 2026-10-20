import { supabase } from '@/lib/supabase';

/**
 * 다른 앱(큐티·중보기도센터 …)을 **로그인 화면 없이** 열어 주는 열쇠.
 *
 * 그 앱들은 주소가 달라 로그인이 따로다. 바이블에서 로그인한 사람이 눌러도 거기서는
 * 낯선 사람이 되어, 기록이 그 폰에만 남고 포인트가 안 오르는 일이 있었다.
 *
 * 그래서 누르는 순간 이 앱의 로그인 토큰으로 그 앱의 `/api/auth/handoff` 를 불러
 * **한 번만 쓰이는 열쇠**를 받고, 열쇠를 주소에 달아 `/auth/handoff` 로 보낸다.
 * 주소에 남는 것은 로그인 토큰이 아니라 쓰고 나면 죽는 열쇠다.
 *
 * 어떤 이유로든 열쇠를 못 받으면(로그인 전·네트워크·이메일 없는 계정·그 앱이 아직
 * 준비 전) **원래 주소**를 그대로 돌려준다. 열쇠 하나 때문에 앱이 안 열리면 안 된다.
 */
export async function withHandoff(appOrigin: string, plainUrl: string, nextPath: string): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return plainUrl;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(`${appOrigin}/api/auth/handoff`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return plainUrl;

    const body = (await res.json()) as { tokenHash?: string };
    if (!body.tokenHash) return plainUrl;

    const params = new URLSearchParams({ token_hash: body.tokenHash, next: nextPath });
    return `${appOrigin}/auth/handoff?${params.toString()}`;
  } catch {
    return plainUrl;
  }
}
