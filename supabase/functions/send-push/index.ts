// 데이빗바이블 웹푸시를 실제로 보내는 곳.
//
// 데이빗바이블은 Vercel 에 정적 웹으로 나가서 서버가 없다. VAPID 비밀키를
// 쥘 곳이 여기뿐이라 보내는 일을 이 함수가 맡는다.
//
// 하는 일은 단순하다 — push_outbox 에 아직 안 보낸 줄을 집어, 그 주제를 켜 둔
// 구독 전부에 밀어 넣고, 결과를 그 줄에 적는다.
//
// 배포:
//   supabase functions deploy send-push
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
//
// 부르는 쪽은 글을 올린 직후의 앱이다. 글쓰기와 한 몸으로 묶지 않는다 —
// 알림이 실패해도 글은 이미 올라가 있어야 한다.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT) {
    return json({ error: "VAPID 키가 설정되지 않았습니다." }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  // service role 로 읽는다. 남의 구독은 RLS 가 막고 있는데, 보내려면 그것을
  // 읽어야 한다. 이 키는 Edge Function 안에만 있고 앱에는 나가지 않는다.
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: pending } = await db
    .from("push_outbox")
    .select("id, topic, title, body, url")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!pending || pending.length === 0) return json({ sent: 0, jobs: 0 });

  let totalSent = 0;

  for (const job of pending) {
    const { data: subs } = await db
      .from("app_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .contains("topics", [job.topic]);

    const payload = JSON.stringify({
      title: job.title,
      body: job.body,
      url: job.url,
      // 같은 주제는 새 알림이 옛것을 덮는다. 편지가 알림창에 쌓이지 않게.
      tag: job.topic,
    });

    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          sent += 1;
        } catch (e) {
          // 404·410 은 그 구독이 죽었다는 뜻이다(브라우저 지움·알림 끔).
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(sub.id);
        }
      }),
    );

    if (dead.length > 0) {
      await db.from("app_push_subscriptions").delete().in("id", dead);
    }

    await db
      .from("push_outbox")
      .update({ sent_at: new Date().toISOString(), sent_count: sent })
      .eq("id", job.id);

    totalSent += sent;
  }

  return json({ sent: totalSent, jobs: pending.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
