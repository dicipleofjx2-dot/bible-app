import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  ACTION_LABEL,
  EMPTY_STATE,
  applyAction,
  loadSettings,
  loadState,
  saveSettings,
  saveState,
  undoLast,
  type ActionKind,
  type MailFlags,
  type OrganizerState,
} from '@/db/emailOrganizer';
import {
  CATEGORY_META,
  DEFAULT_SETTINGS,
  canExecute as canExecuteNow,
  classifyAll,
  trialDaysLeft as trialDaysLeftOf,
  type ClassifiedMail,
  type OrganizerSettings,
} from '@/lib/emailOrganizer';
import { buildSampleMailbox } from '@/lib/emailOrganizerSample';

export type MailboxMail = ClassifiedMail & { flags: MailFlags };

/**
 * 화면 넷이 함께 쓰는 메일함.
 *
 * 분류는 **읽을 때마다 다시 계산한다**. 판정 결과를 저장해 두면 규칙을 고쳐도
 * 옛 판정이 남아, 「설정을 바꿨는데 왜 그대로냐」가 된다. 스무 통짜리 체험
 * 메일함에서 다시 세는 비용은 없는 것이나 마찬가지다.
 */
export function useMailbox() {
  const [settings, setSettings] = useState<OrganizerSettings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<OrganizerState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  // 한 화면이 열려 있는 동안 기준 시각이 흔들리면 「어제」가 목록 중간에서
  // 「오늘」로 바뀐다. 화면을 여는 순간의 시각으로 고정한다.
  const nowRef = useRef(new Date());
  const now = nowRef.current;

  const reload = useCallback(async () => {
    const [s, st] = await Promise.all([loadSettings(), loadState()]);
    setSettings(s);
    setState(st);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const mails: MailboxMail[] = useMemo(() => {
    const classified = classifyAll(buildSampleMailbox(now), settings, now);
    return classified.map((mail) => {
      const flags = state.flags[mail.id] ?? {};
      let classification = mail.classification;
      if (flags.category && flags.category !== classification.category) {
        // 사용자가 고친 분류가 항상 이긴다(§3.3). 보호 분류로 옮겼다면 그 즉시
        // 삭제 후보에서 빠져야 한다 — 그러려고 옮긴 것이다.
        const guarded = CATEGORY_META[flags.category].guarded;
        classification = {
          ...classification,
          category: flags.category,
          deleteCandidate: guarded ? false : classification.deleteCandidate,
          guardReason: guarded ? '사용자가 보호 분류로 옮겼습니다' : classification.guardReason,
          reasons: ['사용자가 직접 고친 분류입니다', ...classification.reasons],
        };
      }
      return { ...mail, read: flags.read ?? mail.read, classification, flags };
    });
  }, [settings, state, now]);

  const inbox = useMemo(
    () => mails.filter((m) => !m.flags.archived && !m.flags.trashed),
    [mails],
  );

  const act = useCallback(
    async (kind: ActionKind, mailIds: string[], patch: MailFlags, note?: string) => {
      if (mailIds.length === 0) return;
      const next = applyAction(
        state,
        kind,
        mailIds,
        patch,
        note ?? `${ACTION_LABEL[kind]} · ${mailIds.length}통`,
        new Date(),
      );
      setState(next);
      await saveState(next);
    },
    [state],
  );

  const undo = useCallback(async () => {
    const next = undoLast(state);
    setState(next);
    await saveState(next);
  }, [state]);

  const updateSettings = useCallback(async (patch: Partial<OrganizerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch(() => {});
      return next;
    });
  }, []);

  return {
    loading,
    now,
    settings,
    state,
    mails,
    inbox,
    act,
    undo,
    reload,
    updateSettings,
    trialDaysLeft: trialDaysLeftOf(settings, now),
    canExecute: canExecuteNow(settings, now),
  };
}
