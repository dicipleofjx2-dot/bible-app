const fs=require("fs");
const e=(f,k)=>{const l=fs.readFileSync(f,"utf8").split(/\r?\n/).find(x=>x.startsWith(k+"="));return l.slice(k.length+1).trim().replace(/^["']|["']$/g,"");};
const URL=e(".env","EXPO_PUBLIC_SUPABASE_URL");
const SK=e("C:/Users/dicip/Documents/dg-smart-bulletin/.migration.env","NEW_SUPABASE_SERVICE_ROLE_KEY");
const H={apikey:SK,Authorization:`Bearer ${SK}`,"Content-Type":"application/json"};
const rpc=async(fn,body)=>{const r=await fetch(`${URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:H,body:JSON.stringify(body||{})});
  const t=await r.text(); if(!r.ok){console.log("ERR",fn,r.status,t.slice(0,200));return null;} try{return JSON.parse(t)}catch{return t}};
const g=async p=>{const r=await fetch(`${URL}/rest/v1/${p}`,{headers:H});const t=await r.text();
  if(!r.ok){console.log("ERR",r.status,t.slice(0,150));return[]} try{return JSON.parse(t)}catch{return[]}};

// 내가 손으로 다시 셈 — DB 결과와 대조한다
const CUT="2026-08-19";
const pts=r=>(r.quiz_score>=100?30:r.quiz_score>=90?20:r.quiz_score>=80?10:0)
  +(r.memorization_success?10:0)+(r.speed_quiz_success?10:0);
const days=(a,b)=>{const o=[];for(let d=new Date(a+"T00:00:00Z");d<=new Date(b+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+1))o.push(d.toISOString().slice(0,10));return o;};

(async()=>{
  const since=await rpc("reading_helper_points_since");
  console.log("포인트 시작일:", since);
  const pen=await rpc("reading_helper_penalties");
  if(!pen){console.log("→ 0055 가 아직 안 들어갔습니다.");return;}
  console.log(`벌점 대상 ${pen.length}명\n`);

  const [recs,prog,profs]=await Promise.all([
    g(`reading_helper_day_records?select=user_id,date,quiz_score,memorization_success,speed_quiz_success&limit=5000`),
    g(`reading_helper_progress?select=user_id,start_date&limit=500`),
    g(`profiles?select=id,username&limit=500`),
  ]);
  const name=new Map(profs.map(p=>[p.id,p.username||"이름없음"]));
  const mask=n=>n.includes("@")?n.slice(0,3)+"***":n;
  const penMap=new Map(pen.map(p=>[p.user_id,p]));

  // 어제(새벽4시 기준). 지금 10시대라 어제는 8/24
  const YEST="2026-08-24";
  let mismatch=0;
  const rows=[];
  for(const p of prog){
    const mine=recs.filter(r=>r.user_id===p.user_id);
    const earned=mine.filter(r=>r.date>=CUT).reduce((s,r)=>s+pts(r),0);
    const from=p.start_date>CUT?p.start_date:CUT;
    let myPen=0,myMissed=0;
    if(from<=YEST){
      const done=new Set(mine.filter(r=>r.quiz_score>=80).map(r=>r.date));
      let st=0;
      for(const d of days(from,YEST)){ if(done.has(d)){st=0;continue;} st++;myMissed++;myPen+=(st%3===0)?50:10; }
    }
    const dbp=penMap.get(p.user_id);
    const dbPen=dbp?dbp.penalty:0, dbMissed=dbp?dbp.missed_days:0;
    if(dbPen!==myPen||dbMissed!==myMissed){mismatch++;
      console.log(`  ✗ ${mask(name.get(p.user_id)||"?")}: DB(${dbMissed}일 ${dbPen}점) vs 계산(${myMissed}일 ${myPen}점)`);}
    rows.push({u:p.user_id,earned,pen:dbPen,missed:dbMissed,net:Math.max(earned-dbPen,0)});
  }
  console.log(mismatch===0?"✓ DB 벌점과 손계산이 전부 일치":`✗ 어긋남 ${mismatch}명`);

  rows.sort((a,b)=>b.net-a.net);
  console.log("\n이름            번점  빠진날  벌점   최종");
  rows.slice(0,15).forEach(r=>console.log(
    `${mask(name.get(r.u)||"?").padEnd(15)}${String(r.earned).padStart(4)}${String(r.missed).padStart(6)}${String(-r.pen).padStart(7)}${String(r.net).padStart(7)}`));
  console.log(`\n0점인 사람 ${rows.filter(r=>r.net===0).length}명 · 음수 ${rows.filter(r=>r.net<0).length}명(0이어야 함)`);

  const rank=await rpc("reading_helper_ranking",{top_n:10});
  console.log("\n=== 순위표(DB) 상위 10 ===");
  (rank||[]).forEach(r=>console.log(`  ${String(r.rank).padStart(2)} ${r.display_name.padEnd(15)} ${String(r.points).padStart(4)}점 (이번주 ${r.week_points})`));
})();
