// ============================================================
// 密码保险箱 — 应用前后台切换监听 + 自动锁定
// ============================================================

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/authStore';

/**
 * 监听应用前后台切换，实现"离开即锁"
 * - 进入后台时记录时间戳
 * - 回到前台时检查是否超过自动锁定超时
 * - 超时则清空密钥并锁定
 */
export function useAppState(): void {
  const backgroundTimeRef = useRef<number | null>(null);
  const { isLocked, autoLockTimeout, lock } = useAuthStore();

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // 应用进入后台或变为非活跃状态
        if (!isLocked) {
          backgroundTimeRef.current = Date.now();
        }
      } else if (nextState === 'active') {
        // 应用回到前台
        if (!isLocked && backgroundTimeRef.current !== null) {
          const elapsed = (Date.now() - backgroundTimeRef.current) / 1000;
          if (elapsed >= autoLockTimeout) {
            lock();
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isLocked, autoLockTimeout, lock]);
}
