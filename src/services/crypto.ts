// ============================================================
// 密码保险箱 — 加密服务 (AES-256-CBC + PBKDF2)
// ============================================================

import CryptoJS from 'crypto-js';
import { getRandomBytes } from 'expo-crypto';
import { PBKDF2_ITERATIONS, AES_KEY_LENGTH } from '../constants/theme';

/**
 * Uint8Array → 十六进制字符串
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 生成安全的随机盐值 (16 bytes → 32 hex chars)
 * 使用 expo-crypto 获取硬件级安全随机数
 */
export function generateSalt(): string {
  const bytes = getRandomBytes(16);
  return bytesToHex(bytes);
}

/**
 * 生成随机 IV (16 bytes → 32 hex chars)
 * AES-CBC 要求每个加密操作使用唯一的 IV
 */
export function generateIV(): string {
  const bytes = getRandomBytes(16);
  return bytesToHex(bytes);
}

/**
 * 使用 PBKDF2 从主密码派生 AES 密钥
 * @param masterPassword 用户主密码
 * @param salt 盐值 (hex 字符串)
 * @returns 256-bit AES Key (hex 字符串)
 */
export function deriveKey(masterPassword: string, salt: string): string {
  const saltWA = CryptoJS.enc.Hex.parse(salt);
  const key = CryptoJS.PBKDF2(masterPassword, saltWA, {
    keySize: AES_KEY_LENGTH / 32, // 256 bits → 8 words of 32 bits
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString(CryptoJS.enc.Hex);
}

/**
 * 对 AES Key 做哈希，用于安全存储验证
 * 不直接存储 AES Key，只存储其 SHA256 哈希
 */
export function hashKey(aesKey: string): string {
  return CryptoJS.SHA256(aesKey).toString(CryptoJS.enc.Hex);
}

/**
 * 使用 AES-256-CBC 加密明文
 * @param plaintext 明文
 * @param aesKey AES 密钥 (hex 字符串)
 * @returns "iv:ciphertext" 格式的字符串 (均为 hex)
 */
export function encrypt(plaintext: string, aesKey: string): string {
  const iv = generateIV();
  const keyWA = CryptoJS.enc.Hex.parse(aesKey);
  const ivWA = CryptoJS.enc.Hex.parse(iv);

  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // encrypted.toString() 默认返回 Base64 编码的密文
  // 我们使用 ciphertext 的 hex 表示 + iv 前缀
  const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return `${iv}:${cipherHex}`;
}

/**
 * 使用 AES-256-CBC 解密密文
 * @param encryptedData "iv:ciphertext" 格式的字符串
 * @param aesKey AES 密钥 (hex 字符串)
 * @returns 明文
 */
export function decrypt(encryptedData: string, aesKey: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, cipherHex] = parts;
  const keyWA = CryptoJS.enc.Hex.parse(aesKey);
  const ivWA = CryptoJS.enc.Hex.parse(ivHex);
  const cipherWA = CryptoJS.enc.Hex.parse(cipherHex);

  // 重建 CipherParams 对象
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: cipherWA,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
