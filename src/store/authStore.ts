// ============================================================
// 密码保险箱 — 认证状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import { AuthState } from '../types';
import { DEFAULT_AUTO_LOCK_TIMEOUT, DEFAULT_CLIPBOARD_CLEAR_TIMEOUT } from '../constants/theme';
import * as SecureStore from '../services/secureStore';
import { deriveKey, generateSalt, hashKey } from '../services/crypto';
import { initDatabase } from '../services/database';

interface AuthActions {
  /** 首次设置主密码 */
  setupMasterPassword: (masterPassword: string) => Promise<void>;
  /** 验证登录密码 */
  loginWithPassword: (password: string) => Promise<boolean>;
  /** 修改主密码：验证旧密码后重新加密所有记录 */
  changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  /** 仅验证密码是否正确（不改变锁定状态） */
  verifyPassword: (password: string) => Promise<boolean>;
  /** 用已存储的 AES Key 恢复会话 */
  unlockWithKey: (aesKey: string) => void;
  /** 通过生物识别解锁（读取钥匙串中的密钥） */
  unlockWithBiometrics: () => Promise<boolean>;
  /** 锁定应用 */
  lock: () => void;
  /** 加载持久化设置 */
  loadSettings: () => Promise<void>;
  /** 更新自动锁定超时 */
  setAutoLockTimeout: (seconds: number) => Promise<void>;
  /** 更新剪贴板清除超时 */
  setClipboardClearTimeout: (seconds: number) => Promise<void>;
  /** 切换生物识别 */
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  /** 检查是否为首次使用 */
  checkFirstTime: () => Promise<boolean>;
  /** 重置所有数据 */
  resetAll: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // ---- State ----
  isLocked: true,
  isFirstTime: false,
  aesKey: null,
  biometricEnabled: false,
  autoLockTimeout: DEFAULT_AUTO_LOCK_TIMEOUT,
  clipboardClearTimeout: DEFAULT_CLIPBOARD_CLEAR_TIMEOUT,

  // ---- Actions ----

  checkFirstTime: async (): Promise<boolean> => {
    const isFirst = await SecureStore.isFirstTimeSetup();
    set({ isFirstTime: isFirst, isLocked: true });
    return isFirst;
  },

  setupMasterPassword: async (masterPassword: string): Promise<void> => {
    // 1. 生成随机盐值
    const salt = generateSalt();

    // 2. 派生 AES 密钥
    const aesKey = deriveKey(masterPassword, salt);

    // 3. 哈希 AES Key 用于存储验证
    const keyHash = hashKey(aesKey);

    // 4. 持久化盐值和哈希
    await SecureStore.saveMasterSalt(salt);
    await SecureStore.saveMasterHash(keyHash);

    // 5. 初始化数据库
    initDatabase();

    // 6. 更新状态
    set({
      isFirstTime: false,
      isLocked: false,
      aesKey,
    });
  },

  loginWithPassword: async (password: string): Promise<boolean> => {
    // 1. 读取盐值
    const salt = await SecureStore.getMasterSalt();
    if (!salt) return false;

    // 2. 派生密钥
    const aesKey = deriveKey(password, salt);

    // 3. 比对哈希
    const storedHash = await SecureStore.getMasterHash();
    const keyHash = hashKey(aesKey);

    if (keyHash === storedHash) {
      set({ isLocked: false, aesKey });
      // 如果生物识别已启用，将密钥写入生物保护存储
      if (get().biometricEnabled) {
        SecureStore.saveAesKeyForBiometric(aesKey).catch(() => {});
      }
      return true;
    }

    return false;
  },

  changeMasterPassword: async (oldPassword: string, newPassword: string): Promise<boolean> => {
    // 1. 获取旧密钥：优先用传入密码派生，否则用内存中的当前密钥（生物识别路径）
    let oldAesKey: string;
    if (oldPassword) {
      const oldSalt = await SecureStore.getMasterSalt();
      if (!oldSalt) return false;
      oldAesKey = deriveKey(oldPassword, oldSalt);
      const storedHash = await SecureStore.getMasterHash();
      if (hashKey(oldAesKey) !== storedHash) return false;
    } else {
      oldAesKey = get().aesKey || '';
      if (!oldAesKey) return false;
    }

    // 2. 用旧密钥解密所有记录
    const { decrypt } = await import('../services/crypto');
    const DB = await import('../services/database');
    const allRecords = DB.getAllRecords();
    const decryptedRecords: { id: number; password: string }[] = [];
    for (const r of allRecords) {
      try {
        const plain = decrypt(r.password, oldAesKey);
        decryptedRecords.push({ id: r.id, password: plain });
      } catch {
        decryptedRecords.push({ id: r.id, password: r.password }); // 保持原样
      }
    }

    // 3. 生成新盐和密钥
    const newSalt = generateSalt();
    const newAesKey = deriveKey(newPassword, newSalt);
    const newHash = hashKey(newAesKey);
    const { encrypt } = await import('../services/crypto');

    // 4. 用新密钥重新加密
    for (const r of decryptedRecords) {
      const encPwd = encrypt(r.password, newAesKey);
      DB.updateRecord(r.id, { password: r.password }, encPwd);
    }

    // 5. 更新存储的盐和哈希
    await SecureStore.saveMasterSalt(newSalt);
    await SecureStore.saveMasterHash(newHash);

    // 6. 更新生物识别密钥
    if (get().biometricEnabled) {
      await SecureStore.saveAesKeyForBiometric(newAesKey);
    }

    // 7. 更新内存状态
    set({ aesKey: newAesKey });

    return true;
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    const salt = await SecureStore.getMasterSalt();
    if (!salt) return false;
    const aesKey = deriveKey(password, salt);
    const storedHash = await SecureStore.getMasterHash();
    return hashKey(aesKey) === storedHash;
  },

  unlockWithKey: (aesKey: string): void => {
    set({ isLocked: false, aesKey });
    // 如果生物识别已启用，将密钥写入生物保护存储
    if (get().biometricEnabled) {
      SecureStore.saveAesKeyForBiometric(aesKey).catch(() => {});
    }
  },

  unlockWithBiometrics: async (): Promise<boolean> => {
    try {
      const aesKey = await SecureStore.getAesKeyFromBiometric();
      if (aesKey) {
        set({ isLocked: false, aesKey });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  lock: (): void => {
    set({ isLocked: true, aesKey: null });
  },

  loadSettings: async (): Promise<void> => {
    try {
      const bioEnabled = await SecureStore.getSetting(SecureStore.KEYS.BIOMETRIC_ENABLED);
      const lockTimeout = await SecureStore.getSetting(SecureStore.KEYS.AUTO_LOCK_TIMEOUT);
      const clipTimeout = await SecureStore.getSetting(SecureStore.KEYS.CLIPBOARD_CLEAR_TIMEOUT);

      set({
        biometricEnabled: bioEnabled === 'true',
        autoLockTimeout: lockTimeout ? parseInt(lockTimeout, 10) : DEFAULT_AUTO_LOCK_TIMEOUT,
        clipboardClearTimeout: clipTimeout ? parseInt(clipTimeout, 10) : DEFAULT_CLIPBOARD_CLEAR_TIMEOUT,
      });
    } catch {
      // 使用默认值
    }
  },

  setAutoLockTimeout: async (seconds: number): Promise<void> => {
    await SecureStore.saveSetting(SecureStore.KEYS.AUTO_LOCK_TIMEOUT, String(seconds));
    set({ autoLockTimeout: seconds });
  },

  setClipboardClearTimeout: async (seconds: number): Promise<void> => {
    await SecureStore.saveSetting(SecureStore.KEYS.CLIPBOARD_CLEAR_TIMEOUT, String(seconds));
    set({ clipboardClearTimeout: seconds });
  },

  setBiometricEnabled: async (enabled: boolean): Promise<void> => {
    await SecureStore.saveSetting(SecureStore.KEYS.BIOMETRIC_ENABLED, String(enabled));
    if (enabled) {
      // 启用时，将当前 AES 密钥写入生物保护存储
      const aesKey = get().aesKey;
      if (aesKey) {
        await SecureStore.saveAesKeyForBiometric(aesKey);
      }
    } else {
      // 禁用时，删除生物保护存储的密钥
      await SecureStore.removeBiometricKey();
    }
    set({ biometricEnabled: enabled });
  },

  resetAll: async (): Promise<void> => {
    await SecureStore.clearAuthData();
    set({
      isLocked: true,
      isFirstTime: true,
      aesKey: null,
      biometricEnabled: false,
    });
  },
}));
