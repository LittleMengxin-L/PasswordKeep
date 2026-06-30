// ============================================================
// 密码保险箱 — 首次设置主密码页面
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

export default function SetupScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setupMasterPassword = useAuthStore((s) => s.setupMasterPassword);

  const handleSetup = async () => {
    if (password.length < 6) {
      Alert.alert('密码太短', '主密码至少需要 6 个字符，以确保数据安全。');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('密码不一致', '两次输入的密码不一致，请重新输入。');
      return;
    }

    setIsLoading(true);
    try {
      await setupMasterPassword(password);
    } catch (error: any) {
      const msg = error?.message ?? String(error ?? '未知错误');
      Alert.alert('设置失败', `错误详情：${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>设置主密码</Text>
          <Text style={styles.subtitle}>
            主密码用于加密保护您的所有账号密码数据。{'\n'}
            请务必牢记，密码丢失后数据将无法恢复。
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>主密码</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="请设置主密码（至少6位）"
              placeholderTextColor={Colors.light.textTertiary}
              autoFocus
              maxLength={64}
            />
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.toggleText}>{showPassword ? '🙈' : '显示'}</Text>
            </TouchableOpacity>
          </View>

          {/* 密码强度指示器 */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${passwordStrength.percent}%`,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: Spacing.lg }]}>确认密码</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="请再次输入主密码"
              placeholderTextColor={Colors.light.textTertiary}
              maxLength={64}
            />
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setShowConfirm(!showConfirm)}
            >
              <Text style={styles.toggleText}>{showConfirm ? '隐藏' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.errorText}>两次输入的密码不一致</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (password.length < 6 || password !== confirmPassword || isLoading) &&
              styles.buttonDisabled,
          ]}
          onPress={handleSetup}
          disabled={password.length < 6 || password !== confirmPassword || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '正在设置...' : '完成设置'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.notice}>
          ⚠️ 密码不会上传到任何服务器，仅存储在您的设备本地。
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- 密码强度评估 ----

function getPasswordStrength(pwd: string): {
  percent: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  if (score <= 1) return { percent: 20, label: '弱', color: Colors.light.danger };
  if (score === 2) return { percent: 40, label: '较弱', color: Colors.light.warning };
  if (score === 3) return { percent: 60, label: '中等', color: Colors.light.warning };
  if (score === 4) return { percent: 80, label: '强', color: Colors.light.success };
  return { percent: 100, label: '非常强', color: Colors.light.success };
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
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
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
  notice: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xl,
    lineHeight: 18,
  },
});
