// ============================================================
// 密码保险箱 — 生物识别服务
// ============================================================

import * as LocalAuthentication from 'expo-local-authentication';

/** 检查设备是否支持生物识别 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  types: LocalAuthentication.AuthenticationType[];
}> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return { available: false, types: [] };
  }

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { available: true, types };
}

/** 获取生物识别类型名称（UI 展示用） */
export function getBiometricTypeName(
  types: LocalAuthentication.AuthenticationType[]
): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return '面部识别';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return '指纹识别';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return '虹膜识别';
  }
  return '生物识别';
}

/** 执行生物识别验证 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { available } = await isBiometricAvailable();
    if (!available) {
      return { success: false, error: '设备不支持生物识别' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '验证身份以解锁密码保险箱',
      fallbackLabel: '使用密码登录',
      cancelLabel: '取消',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === 'user_cancel') {
      return { success: false, error: '用户取消' };
    }

    return {
      success: false,
      error: result.error === 'user_fallback'
        ? '用户选择密码登录'
        : '验证失败，请重试',
    };
  } catch (error) {
    return { success: false, error: '生物识别出错' };
  }
}
