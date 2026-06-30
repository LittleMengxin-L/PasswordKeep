// ============================================================
// 密码保险箱 — 安全存储服务 (expo-secure-store)
// ============================================================

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  MASTER_SALT: 'master_salt',
  MASTER_HASH: 'master_hash',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  AUTO_LOCK_TIMEOUT: 'auto_lock_timeout',
  CLIPBOARD_CLEAR_TIMEOUT: 'clipboard_clear_timeout',
  IS_DARK_MODE: 'is_dark_mode',
};

/** 保存主密码盐值 */
export async function saveMasterSalt(salt: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.MASTER_SALT, salt);
}

/** 获取主密码盐值 */
export async function getMasterSalt(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.MASTER_SALT);
}

/** 保存主密码哈希（用于验证） */
export async function saveMasterHash(hash: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.MASTER_HASH, hash);
}

/** 获取主密码哈希 */
export async function getMasterHash(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.MASTER_HASH);
}

/** 删除所有认证相关数据（用于重置） */
export async function clearAuthData(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.MASTER_SALT);
  await SecureStore.deleteItemAsync(KEYS.MASTER_HASH);
}

/** 检查是否已完成首次设置 */
export async function isFirstTimeSetup(): Promise<boolean> {
  const salt = await getMasterSalt();
  const hash = await getMasterHash();
  return !salt || !hash;
}

/** 保存应用设置 */
export async function saveSetting(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

/** 读取应用设置 */
export async function getSetting(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

/** AES 密钥的存储键 */
const BIOMETRIC_KEY = 'biometric_aes_key';

/**
 * 将 AES 密钥保存到系统钥匙串，受生物识别保护
 * 读取时系统会自动弹出指纹/面部识别
 */
export async function saveAesKeyForBiometric(aesKey: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, aesKey, {
    requireAuthentication: true,
    authenticationPrompt: '使用生物识别解锁密码保险箱',
  });
}

/**
 * 通过生物识别读取 AES 密钥
 * 调用此函数会触发系统级指纹/面部识别验证
 * @returns AES 密钥，验证失败返回 null
 */
export async function getAesKeyFromBiometric(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_KEY, {
      requireAuthentication: true,
      authenticationPrompt: '验证身份以解锁',
    });
  } catch {
    return null;
  }
}

/** 删除生物识别存储的密钥 */
export async function removeBiometricKey(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
}

export { KEYS };
