// ============================================================
// 密码保险箱 — 修改主密码弹窗
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { authenticateWithBiometrics, isBiometricAvailable } from '../services/biometrics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [step, setStep] = useState<'verify' | 'newPwd'>('verify');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const changeMasterPassword = useAuthStore((s) => s.changeMasterPassword);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);

  const reset = () => {
    setStep('verify');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBiometric = async () => {
    setLoading(true);
    const { success } = await authenticateWithBiometrics();
    if (success) {
      setStep('newPwd');
    } else {
      setError('生物识别验证失败');
    }
    setLoading(false);
  };

  const handleVerifyPassword = async () => {
    if (!oldPassword) {
      setError('请输入旧密码');
      return;
    }
    setLoading(true);
    const ok = await useAuthStore.getState().verifyPassword(oldPassword);
    // Note: we'll verify again in changeMasterPassword for security
    if (ok) {
      setStep('newPwd');
    } else {
      setError('旧密码不正确');
    }
    setLoading(false);
  };

  const handleChange = async () => {
    if (newPassword.length < 6) {
      setError('新密码至少需要 6 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // If verified via old password, use it. If via biometric, we need to prompt for old password
      const success = await changeMasterPassword(
        step === 'verify' ? oldPassword : '',
        newPassword
      );

      if (!success && step === 'newPwd') {
        // Biometric verification doesn't give us the old password
        // We need to prompt for it now
        setStep('verify');
        setError('请先输入旧密码');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
        return;
      }

      if (success) {
        Alert.alert('修改成功', '主密码已更新，所有记录已用新密码重新加密。');
        handleClose();
      } else {
        setError('旧密码验证失败');
      }
    } catch (e: any) {
      setError(e?.message ?? '修改失败');
    }
    setLoading(false);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>
            {step === 'verify' ? '验证身份' : '设置新密码'}
          </Text>

          {step === 'verify' ? (
            <>
              <Text style={styles.message}>
                请输入旧密码或使用生物识别验证
              </Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={(t) => { setOldPassword(t); setError(''); }}
                secureTextEntry
                placeholder="请输入旧密码"
                placeholderTextColor={Colors.light.textTertiary}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                {biometricEnabled && (
                  <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric} disabled={loading}>
                    <Text style={styles.bioText}>👆 指纹验证</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.confirmBtn, (!oldPassword || loading) && styles.disabled]}
                  onPress={handleVerifyPassword}
                  disabled={!oldPassword || loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.confirmText}>验证</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.message}>
                请输入新主密码（至少 6 位）
              </Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(''); }}
                secureTextEntry
                placeholder="新密码（至少6位）"
                placeholderTextColor={Colors.light.textTertiary}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: Spacing.md }]}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                secureTextEntry
                placeholder="确认新密码"
                placeholderTextColor={Colors.light.textTertiary}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, (newPassword.length < 6 || loading) && styles.disabled]}
                  onPress={handleChange}
                  disabled={newPassword.length < 6 || loading}
                >
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.confirmText}>确认修改</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: FontSize.lg,
    color: Colors.light.text,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.inputBg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  bioBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary + '15',
    alignItems: 'center',
  },
  bioText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  confirmText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
