// ============================================================
// 密码保险箱 — 登录页面（密码 + 生物识别）
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import {
  isBiometricAvailable,
  getBiometricTypeName,
} from '../services/biometrics';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string>('');
  const [hasBiometric, setHasBiometric] = useState(false);

  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const unlockWithBiometrics = useAuthStore((s) => s.unlockWithBiometrics);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);

  // 检查生物识别可用性
  useEffect(() => {
    (async () => {
      const { available, types } = await isBiometricAvailable();
      if (available && biometricEnabled) {
        setHasBiometric(true);
        setBiometricTypes(getBiometricTypeName(types));
      }
    })();
  }, [biometricEnabled]);

  // 自动尝试生物识别
  useEffect(() => {
    if (hasBiometric) {
      handleBiometricAuth();
    }
  }, [hasBiometric]);

  const handleBiometricAuth = useCallback(async () => {
    setIsLoading(true);
    const success = await unlockWithBiometrics();
    if (!success) {
      // 生物识别失败或取消，不弹窗（用户可能想用密码）
    }
    setIsLoading(false);
  }, [unlockWithBiometrics]);

  const handleLogin = async () => {
    if (password.length < 6) {
      Alert.alert('密码错误', '请检查主密码是否正确。');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginWithPassword(password);
      if (!success) {
        Alert.alert('密码错误', '主密码不正确，请重新输入。');
        setPassword('');
      }
    } catch {
      Alert.alert('登录失败', '无法验证密码，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>密码保险箱</Text>
          <Text style={styles.subtitle}>请输入主密码以解锁</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>主密码</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="请输入主密码"
              placeholderTextColor={Colors.light.textTertiary}
              autoFocus={!hasBiometric}
              onSubmitEditing={handleLogin}
              maxLength={64}
            />
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.toggleText}>{showPassword ? '🙈' : '显示'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (password.length < 6 || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={password.length < 6 || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>解锁</Text>
          )}
        </TouchableOpacity>

        {hasBiometric && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
            disabled={isLoading}
          >
            <Text style={styles.biometricIcon}>
              {biometricTypes.includes('面部') ? '👤' : '👆'}
            </Text>
            <Text style={styles.biometricText}>
              使用{biometricTypes}解锁
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  icon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FontSize.lg,
    color: Colors.light.text,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  toggleText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadow.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.textTertiary,
    ...Shadow.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  biometricText: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
    fontWeight: '500',
  },
});
