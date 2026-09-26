// 설정·연결·잠금을 한 곳에서 쥔다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { X32Client, type ClientState } from '@/x32/client';
import { DEFAULT_CONFIG, sanitizeConfig, watchedTargets, type AppConfig } from '@/x32/config';
import { SimMixer, createSimTransport } from '@/x32/simMixer';
import { createUdpTransport } from '@/x32/udpTransport';
import { X32_PORT } from '@/x32/transport';

const KEY = 'x32remote.config.v1';
export const IS_WEB = Platform.OS === 'web';

type Store = {
  config: AppConfig;
  saveConfig: (c: AppConfig) => void;
  client: X32Client | null;
  connectError: string | null;
  /** 조작 잠금 — 켜 두면 어떤 버튼도 믹서로 가지 않는다 */
  locked: boolean;
  setLocked: (v: boolean) => void;
  /** 관리자 모드 — 메인 LR·장면 호출 */
  admin: boolean;
  setAdmin: (v: boolean) => void;
  reconnect: () => void;
};

const Ctx = createContext<Store | null>(null);
// 시뮬레이터 믹서는 재연결해도 값이 유지되게 하나만 둔다.
const sim = new SimMixer();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [client, setClient] = useState<X32Client | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [gen, setGen] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => setConfig(s ? sanitizeConfig(JSON.parse(s)) : DEFAULT_CONFIG))
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, []);

  const useSim = !!config && (IS_WEB || config.simulator);
  const host = config?.host;
  const port = config?.port;

  useEffect(() => {
    if (!config) return;
    let c: X32Client;
    try {
      const tr = useSim ? createSimTransport(sim, { latencyMs: 12 }) : createUdpTransport(host!, port ?? X32_PORT);
      c = new X32Client(tr);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
      setClient(null);
      return;
    }
    setConnectError(null);
    c.start(watchedTargets(config));
    setClient(c);
    return () => c.stop();
    // 채널 배치가 바뀌는 것만으로 다시 붙지 않는다(setWatched 로 따로 알린다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSim, host, port, gen, !!config]);

  useEffect(() => {
    if (client && config) client.setWatched(watchedTargets(config));
  }, [client, config]);

  // 앱이 뒤로 가면 민감 조작을 잠근다(§9).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        setAdmin(false);
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  // 끊김·복귀를 진동으로 알린다. 끊김은 일반 실행과 다른 패턴(§8).
  const prev = useRef<string>('idle');
  useEffect(() => {
    if (!client) return;
    return client.subscribe(() => {
      const s = client.state.status;
      if (s === prev.current) return;
      if (s === 'lost') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (s === 'connected' && prev.current === 'lost') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      prev.current = s;
    });
  }, [client]);

  const store = useMemo<Store | null>(
    () =>
      config && {
        config,
        saveConfig: (c) => {
          setConfig(c);
          AsyncStorage.setItem(KEY, JSON.stringify(c)).catch(() => {});
        },
        client,
        connectError,
        locked,
        setLocked,
        admin,
        setAdmin,
        reconnect: () => setGen((g) => g + 1),
      },
    [config, client, connectError, locked, admin],
  );

  if (!store) return null;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider 밖');
  return s;
}

const EMPTY: ClientState = { status: 'idle', latencyMs: null, info: null, channels: {}, scenes: {}, fades: {}, syncingUntil: 0 };
const noop = () => () => {};

export function useMixer(): ClientState {
  const { client } = useStore();
  return useSyncExternalStore(client?.subscribe ?? noop, client?.getState ?? (() => EMPTY), client?.getState ?? (() => EMPTY));
}
