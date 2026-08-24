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

  // 상태 조회 — "알림이 안 온다"를 가릴 때 쓴다. 숫자만 돌려주고 구독 내용은
  // 절대 내보내지 않는다.
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.stats) {
    const subs = await db
      .from("app_push_subscriptions")
      .select("id", { count: "exact", head: true });
    const outbox = await db.from("push_outbox").select("id", { count: "exact", head: true });
    const unsent = await db
      .from("push_outbox")
      .select("id", { count: "exact", head: true })
      .is("sent_at", null);
    const recent = await db
      .from("push_outbox")
      .select("topic, title, sent_at, sent_count")
      .order("created_at", { ascending: false })
      .limit(5);
    return json({
      subscriptions: subs.count ?? 0,
      outboxTotal: outbox.count ?? 0,
      outboxUnsent: unsent.count ?? 0,
      recent: recent.data ?? [],
      vapidReady: true,
    });
  }

  // 앱이 보낸 알림거리를 여기서 쌓는다.
  //
  // 예전에는 앱이 push_outbox 에 직접 넣었는데, 글을 올려도 한 줄도 안 쌓였다.
  // RLS 가 막았고 앱은 그 오류를 삼켰다(알림 때문에 글쓰기가 막히면 안 되므로).
  // 쓰는 길을 이리로 옮기면 그 문제가 통째로 없어진다 — 대신 **부른 사람이
  // 관리자인지 여기서 확인한다.**
  if (body.enqueue) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: who } = await asUser.auth.getUser();
    if (!who?.user) return json({ error: "로그인이 필요합니다." }, 401);

    const { data: profile } = await db
      .from("profiles")
      .select("is_admin")
      .eq("id", who.user.id)
      .maybeSingle();
    if (!profile?.is_admin) return json({ error: "관리자만 보낼 수 있습니다." }, 403);

    const job = body.enqueue as { topic?: string; title?: string; body?: string; url?: string };
    if (job.topic !== "notice" && job.topic !== "shepherd_letter") {
      return json({ error: "알 수 없는 종류입니다." }, 400);
    }
    const { error } = await db.from("push_outbox").insert({
      topic: job.topic,
      title: String(job.title ?? "").slice(0, 120),
      body: String(job.body ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
      url: String(job.url ?? "/"),
      created_by: who.user.id,
    });
    if (error) return json({ error: `쌓기 실패: ${error.message}` }, 500);
  }

  // 시험 발송 — RLS 를 거치지 않고 여기서 바로 한 줄 쌓는다. "구독은 됐는데
  // 알림이 안 온다"가 보내는 길 문제인지 쌓는 길 문제인지 가른다.
  if (body.test) {
    const { error } = await db.from("push_outbox").insert({
      topic: "notice",
      title: "시험 알림입니다",
      body: "이 알림이 보이면 준비가 끝난 것입니다.",
      url: "/notice-board",
    });
    if (error) return json({ error: `쌓기 실패: ${error.message}` }, 500);
  }

  const { data: pending } = await db
    .from("push_outbox")
    .select("id, topic, title, body, url, target_user_ids")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!pending || pending.length === 0) return json({ sent: 0, jobs: 0 });

  let totalSent = 0;

  for (const job of pending) {
    // 받을 사람이 적혀 있으면 그 사람들에게만 간다(0045). 비어 있으면 전처럼
    // 그 주제를 켠 사람 전부에게 — 기존 알림은 그대로다.
    //
    // 저녁 통독 알림이 「오늘 아직 안 하신 분」만 고를 때 쓴다. 이걸 안 보면
    // 이미 다 읽으신 분께도 "아직이시죠?" 가 가서, 그게 알림을 끄게 만드는
    // 가장 흔한 이유가 된다.
    let query = db
      .from("app_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .contains("topics", [job.topic]);
    const only = job.target_user_ids as string[] | null;
    if (only && only.length > 0) query = query.in("user_id", only);
    const { data: subs } = await query;

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
