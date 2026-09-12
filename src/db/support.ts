import { currentChurchId } from '@/lib/churchScope';
import { supabase } from '@/lib/supabase';

/**
 * 후원 정보 — **공용 한 줄 + 교회마다 한 줄**(0083_support_per_church.sql).
 *
 * 쿠팡파트너스 링크는 앱(데이빗바이블) 후원이라 모든 교회가 같이 쓴다(공용 줄).
 * 후원계좌는 교회 것이다. 보여 줄 때는 **공용 위에 교회 줄을 덮되, 교회 줄에서
 * 빈 칸은 공용 값을 쓴다** — 교회는 계좌만 적으면 되고 쿠팡 배너는 살아 있다.
 *
 * 로그인하지 않으면 교회를 알 수 없으니 공용 줄만 쓴다(→ `@/lib/churchScope`).
 */

export type SupportSettings = {
  coupangUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
};

/** 고치는 화면에서 「어느 줄을 고치는가」. */
export type SupportScope = 'church' | 'shared';

const EMPTY_SETTINGS: SupportSettings = {
  coupangUrl: '',
  bankName: '',
  bankAccount: '',
  bankHolder: '',
};

function mapRow(row: any): SupportSettings {
  return {
    coupangUrl: row.coupang_url ?? '',
    bankName: row.bank_name ?? '',
    bankAccount: row.bank_account ?? '',
    bankHolder: row.bank_holder ?? '',
  };
}

function toRow(entry: SupportSettings) {
  return {
    coupang_url: entry.coupangUrl,
    bank_name: entry.bankName,
    bank_account: entry.bankAccount,
    bank_holder: entry.bankHolder,
    updated_at: new Date().toISOString(),
  };
}

/** 교회 줄의 빈 칸은 공용 값으로 메운다. */
function overlay(shared: SupportSettings, church: SupportSettings): SupportSettings {
  const pick = (a: string, b: string) => (a.trim().length > 0 ? a : b);
  return {
    coupangUrl: pick(church.coupangUrl, shared.coupangUrl),
    bankName: pick(church.bankName, shared.bankName),
    bankAccount: pick(church.bankAccount, shared.bankAccount),
    bankHolder: pick(church.bankHolder, shared.bankHolder),
  };
}

/**
 * 후원 화면에 보여 줄 값.
 *
 * 마이그레이션 전에도 깨지지 않는다 — 그때는 공용 줄이 없고 교회 줄만 있어서
 * 자기 교회 것이 그대로 나온다.
 */
export async function getSupportSettings(): Promise<SupportSettings> {
  const churchId = await currentChurchId();
  const query = supabase.from('support_settings').select('*');
  const { data, error } = churchId
    ? await query.or(`church_id.is.null,church_id.eq.${churchId}`)
    : await query.is('church_id', null);
  if (error) throw error;

  const rows = data ?? [];
  const shared = rows.find((r: any) => r.church_id == null);
  const church = churchId ? rows.find((r: any) => r.church_id === churchId) : undefined;
  return overlay(shared ? mapRow(shared) : EMPTY_SETTINGS, church ? mapRow(church) : EMPTY_SETTINGS);
}

/** 고치는 화면에서 쓰는 값 — 덮지 않고 그 줄에 **적혀 있는 대로** 준다. */
export async function getSupportSettingsFor(scope: SupportScope): Promise<SupportSettings> {
  const churchId = scope === 'church' ? await currentChurchId() : null;
  if (scope === 'church' && !churchId) return EMPTY_SETTINGS;

  const query = supabase.from('support_settings').select('*');
  const { data, error } =
    scope === 'church' ? await query.eq('church_id', churchId!).maybeSingle() : await query.is('church_id', null).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : EMPTY_SETTINGS;
}

/**
 * 한 줄을 고친다. 없으면 만든다.
 *
 * upsert 를 쓰지 않는 이유: 유일 인덱스가 **부분 인덱스**라서 `on conflict
 * (church_id)` 로는 못 찾는다(0083 주석). 「고치고, 고쳐진 줄이 없으면 넣는다」로
 * 간다 — 고친 줄을 select 로 돌려받아 세므로 조용히 아무 일도 안 하는 경우가 없다.
 */
export async function saveSupportSettings(scope: SupportScope, entry: SupportSettings): Promise<{ error?: string }> {
  const churchId = scope === 'church' ? await currentChurchId() : null;
  if (scope === 'church' && !churchId) {
    return { error: '소속 교회가 없어 저장할 수 없어요. 마이페이지에서 교회를 먼저 정해주세요.' };
  }

  const patch = toRow(entry);
  const update = supabase.from('support_settings').update(patch);
  const { data, error } =
    scope === 'church' ? await update.eq('church_id', churchId!).select('id') : await update.is('church_id', null).select('id');
  if (error) return { error: error.message };
  if ((data ?? []).length > 0) return {};

  if (scope === 'shared') {
    // 공용 줄은 마이그레이션이 만들어 둔다. 여기서 넣으려 하면 0038 트리거가
    // 글쓴이의 교회로 채워 버려서 공용 줄이 되지 않는다.
    return { error: '공용 줄이 없어요. 0083_support_per_church.sql 을 먼저 실행해주세요.' };
  }

  const { error: insertError } = await supabase
    .from('support_settings')
    .insert({ ...patch, church_id: churchId });
  return { error: insertError?.message };
}

/**
 * 이 사람이 그 줄을 고칠 수 있는가.
 *
 * 판정은 DB 함수(`can_manage_church_settings`, 0078)에 맡긴다 — 전체 관리자
 * (`profiles.is_admin`)와 스마트주보의 교회 관리자를 한 군데서 잇는 함수다.
 * 화면에서 따로 세면 단추는 보이는데 저장이 막히는 일이 생긴다.
 *
 * 공용 줄은 교회가 없으므로(`target_church_id` 가 비어 있다) 전체 관리자만
 * 통과한다 — 한 교회 관리자가 모든 교회의 쿠팡 링크를 바꾸면 안 된다.
 */
export async function canManageSupport(scope: SupportScope): Promise<boolean> {
  const churchId = scope === 'church' ? await currentChurchId() : null;
  const { data, error } = await supabase.rpc('can_manage_church_settings', { target_church_id: churchId });
  if (error) {
    console.error('can_manage_church_settings 실패', error.message);
    return false;
  }
  return !!data;
}
