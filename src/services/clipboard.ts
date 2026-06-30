// ============================================================
// 密码保险箱 — 剪贴板服务
// ============================================================

import * as Clipboard from 'expo-clipboard';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param clearTimeoutSeconds 超时自动清除的秒数，默认 30
 */
export async function copyToClipboard(
  text: string,
  clearTimeoutSeconds: number = 30
): Promise<void> {
  // 清除之前的定时器
  cancelAutoClear();

  await Clipboard.setStringAsync(text);

  // 设置定时自动清除
  if (clearTimeoutSeconds > 0) {
    clearTimer = setTimeout(async () => {
      try {
        const currentContent = await Clipboard.getStringAsync();
        // 只有当剪贴板内容仍是我们的文本时才清除
        if (currentContent === text) {
          await Clipboard.setStringAsync('');
        }
      } catch {
        // 静默失败 — 剪贴板可能已被其他操作占用
      }
      clearTimer = null;
    }, clearTimeoutSeconds * 1000);
  }
}

/** 取消自动清除定时器 */
export function cancelAutoClear(): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}

/**
 * 获取当前剪贴板内容
 */
export async function getClipboardContent(): Promise<string> {
  try {
    const hasString = await Clipboard.hasStringAsync();
    if (hasString) {
      return await Clipboard.getStringAsync();
    }
  } catch {
    // 静默失败
  }
  return '';
}

/**
 * 清除剪贴板内容
 */
export async function clearClipboard(): Promise<void> {
  cancelAutoClear();
  try {
    await Clipboard.setStringAsync('');
  } catch {
    // 静默失败
  }
}
