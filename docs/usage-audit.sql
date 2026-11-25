-- 1) 표별: 용량 / 전체 행 / 최근 60일 새 행 / 마지막 기록일
with t as (
  select c.relname tbl,
    (select column_name from information_schema.columns
      where table_schema='public' and table_name=c.relname
        and column_name in ('created_at','updated_at') order by column_name limit 1) ts
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
)
select tbl,
  pg_size_pretty(pg_total_relation_size(format('public.%I',tbl)::regclass)) as size,
  (xpath('/row/a/text()', query_to_xml(format('select count(*) a from public.%I',tbl),false,true,'')))[1]::text::bigint as total_rows,
  case when ts is null then null else (xpath('/row/b/text()', query_to_xml(format('select count(*) b from public.%I where %I > now() - interval ''60 days''',tbl,ts),false,true,'')))[1]::text::bigint end as rows_60d,
  case when ts is null then null else (xpath('/row/m/text()', query_to_xml(format('select max(%I)::date m from public.%I',ts,tbl),false,true,'')))[1]::text end as last_activity
from t order by rows_60d nulls first, total_rows desc;

-- 2) 전체 DB 크기 (무료 한도 500MB)
select pg_size_pretty(pg_database_size(current_database())) as db_size;

-- 3) 저장소 통별 용량 (무료 한도 1GB 합계)
select bucket_id, count(*) files, pg_size_pretty(sum((metadata->>'size')::bigint)) total
from storage.objects group by 1 order by sum((metadata->>'size')::bigint) desc nulls last;

-- 4) 가입자 / 최근 60일 로그인 (무료 한도 월 50,000 MAU)
select count(*) as users,
  count(*) filter (where last_sign_in_at > now() - interval '60 days') as active_60d,
  count(*) filter (where last_sign_in_at > now() - interval '30 days') as active_30d
from auth.users;
