import { supabase } from '@/lib/supabase';

/**
 * 웹푸시 — 목자의 편지와 알림마당에 새 글이 올라오면 폰 알림창에 띄운다.
 *
 * 데이빗바이블은 Vercel 에 **정적 웹**으로 나가서 서버가 없다. 그래서 받는
 * 쪽은 브라우저가 하고, 보내는 쪽은 Supabase Edge Function(send-push) 이 맡는다.
 * VAPID 비밀키는 그 함수만 쥔다.
 *
 * 폰 앱(네이티브)에서는 이 기능이 통째로 없다. 웹 브라우저에만 있는 것들이라
 * 화면 쪽에서 먼저 걸러야 한다(isPushSupported).
 */

export type PushTopic = 'shepherd_letter' | 'notice';

/** 이 기기에서 웹푸시를 쓸 수 있는가. 폰 앱과 옛 브라우저에서는 false. */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** 아이폰은 홈 화면에 추가해야 알림이 온다. 사파리에서 그냥 열면 안 된다. */
export function needsHomeScreen(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!ios) return false;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

/** base64url 공개키를 브라우저가 받는 바이트로 바꾼다. */
function toBytes(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

/** 지금 이 기기가 알림을 받기로 되어 있는가. */
export async function isPushOn(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * 알림 받기.
 *
 * 브라우저는 **사용자가 누른 그 순간에만** 허락을 물을 수 있다. 화면이 뜨자마자
 * 물으면 거의 다 거절하고, 한 번 거절하면 브라우저 설정에 들어가야 되돌릴 수
 * 있어서 그 사람은 영영 못 받는다.
 */
export async function turnPushOn(): Promise<{ error?: string }> {
  if (!isPushSupported()) return { error: '이 기기에서는 알림을 받을 수 없어요.' };

  const key = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { error: '아직 알림 준비가 끝나지 않았어요.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: '알림이 허용되지 않았어요.' };

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBytes(key),
    });

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const { error } = await supabase.rpc('app_push_subscribe', {
      target_endpoint: json.endpoint ?? '',
      target_p256dh: json.keys?.p256dh ?? '',
      target_auth: json.keys?.auth ?? '',
      target_user_agent: navigator.userAgent.slice(0, 300),
    });
    return { error: error?.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '알림을 켜지 못했어요.' };
  }
}

/** 알림 끄기. 이 기기 하나만 끊는다 — 다른 기기는 계속 받는다. */
export async function turnPushOff(): Promise<{ error?: string }> {
  if (!isPushSupported()) return {};
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return {};
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    const { error } = await supabase.rpc('app_push_unsubscribe', { target_endpoint: endpoint });
    return { error: error?.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '알림을 끄지 못했어요.' };
  }
}

/**
 * 보낼 거리를 쌓고, 보내는 함수를 깨운다.
 *
 * 글쓰기와 한 몸으로 묶지 않는다 — 알림이 실패해도 글은 이미 올라가 있어야
 * 한다. 그래서 이 함수는 **절대 던지지 않는다.**
 */
export async function queuePush(topic: PushTopic, title: string, body: string, url: string) {
  try {
    const { error } = await supabase.from('push_outbox').insert({
      topic,
      title,
      body: body.replace(/\s+/g, ' ').trim().slice(0, 120),
      url,
    });
    if (error) return;

    // 깨우기. 실패해도 줄은 남아 있으므로 다음 발행 때 함께 나간다.
    await supabase.functions.invoke('send-push').catch(() => {});
  } catch {
    // 알림 때문에 글쓰기가 막히면 안 된다.
  }
}
