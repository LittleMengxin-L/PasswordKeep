// ============================================================
// 密码保险箱 — 剪贴板监听 Hook
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ParsedEntry } from '../types';
import { parseClipboardContent } from '../services/parser';
import { getClipboardContent } from '../services/clipboard';

const CHECK_INTERVAL = 5000; // 5 秒检查一次
const RECENT_ENTRIES_TTL = 30000; // 30 秒内不重复提示

/**
 * 监听剪贴板内容，智能识别账号密码格式
 * - 应用从后台回到前台时检查
 * - 每 5 秒定期检查（仅前台）
 */
export function useClipboardMonitor(): ParsedEntry[] | null {
  const [result, setResult] = useState<ParsedEntry[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const lastContentRef = useRef<string>('');
  const lastAlertTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isForegroundRef = useRef<boolean>(true);

  const checkClipboard = async () => {
    try {
      const content = await getClipboardContent();
      if (!content || content === lastContentRef.current) return;

      // 防止短时间内重复提示
      const now = Date.now();
      if (now - lastAlertTimeRef.current < RECENT_ENTRIES_TTL) return;

      const parsed = parseClipboardContent(content);
      if (parsed.length > 0) {
        lastContentRef.current = content;
        lastAlertTimeRef.current = now;
        setResult(parsed);
        setShowModal(true);
      }
    } catch {
      // 静默失败
    }
  };

  useEffect(() => {
    // 前台时定期检查
    intervalRef.current = setInterval(() => {
      if (isForegroundRef.current) {
        checkClipboard();
      }
    }, CHECK_INTERVAL);

    // 前后台切换监听
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        isForegroundRef.current = true;
        // 回到前台时立即检查一次
        setTimeout(checkClipboard, 500);
      } else {
        isForegroundRef.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  // 返回结果给组件渲染 ClipboardModal
  // 实际使用时，HomeScreen 会监听此返回值
  return result;
}
