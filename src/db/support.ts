import { supabase } from '@/lib/supabase';

export type SupportSettings = {
  coupangUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
};

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

// 0028_support_settings.sql이 'default' 싱글턴 행을 시드해두지만, 마이그레이션을
// 아직 안 돌린 경우를 대비해 없으면 빈 설정으로 대체한다.
export async function getSupportSettings(): Promise<SupportSettings> {
  const { data, error } = await supabase.from('support_settings').select('*').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : EMPTY_SETTINGS;
}

export async function updateSupportSettings(entry: SupportSettings): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('support_settings')
    .update({
      coupang_url: entry.coupangUrl,
      bank_name: entry.bankName,
      bank_account: entry.bankAccount,
      bank_holder: entry.bankHolder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default');
  return { error: error?.message };
}
