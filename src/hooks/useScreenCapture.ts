// ============================================================
// 密码保险箱 — 防截屏 Hook
// ============================================================

import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * 在指定页面中禁止截屏/录屏
 * 离开页面时自动恢复
 */
export function useScreenCapture(prevent: boolean = true): void {
  useEffect(() => {
    if (!prevent) return;

    let cancelled = false;

    const enable = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {
        // 平台不支持时静默失败
      }
    };

    enable();

    return () => {
      cancelled = true;
      const disable = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch {
          // 静默失败
        }
      };
      disable();
    };
  }, [prevent]);
}
