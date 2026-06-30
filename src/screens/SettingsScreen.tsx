// ============================================================
// 密码保险箱 — 设置页面
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { usePasswordStore } from '../store/passwordStore';
import PasswordPrompt from '../components/PasswordPrompt';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  isBiometricAvailable,
  authenticateWithBiometrics,
  getBiometricTypeName,
} from '../services/biometrics';

export default function SettingsScreen() {
  const {
    autoLockTimeout,
    clipboardClearTimeout,
    biometricEnabled,
    setAutoLockTimeout,
    setClipboardClearTimeout,
    setBiometricEnabled,
    lock,
    changeMasterPassword,
  } = useAuthStore();

  const deduplicateRecords = usePasswordStore((s) => s.deduplicateRecords);
  const exportSelected = usePasswordStore((s) => s.exportSelected);

  const [biometricTypeName, setBiometricTypeName] = useState<string>('');
  const [hasBiometric, setHasBiometric] = useState(false);
  const [showExportPrompt, setShowExportPrompt] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<'csv' | 'json'>('csv');
  const [showChangePwdPrompt, setShowChangePwdPrompt] = useState(false);

  useEffect(() => {
    (async () => {
      const { available, types } = await isBiometricAvailable();
      if (available) {
        setHasBiometric(true);
        setBiometricTypeName(getBiometricTypeName(types));
      }
    })();
  }, []);

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      // 先进行生物识别验证
      const { success } = await authenticateWithBiometrics();
      if (success) {
        await setBiometricEnabled(true);
        Alert.alert('已启用', `已启用${biometricTypeName}解锁。`);
      } else {
        Alert.alert('验证失败', '生物识别验证未通过，请重试。');
        return;
      }
    } else {
      await setBiometricEnabled(false);
    }
  };

  const handleAutoLockChange = () => {
    const options = [
      { label: '15 秒', value: 15 },
      { label: '30 秒（推荐）', value: 30 },
      { label: '1 分钟', value: 60 },
      { label: '5 分钟', value: 300 },
      { label: '从不自动锁定', value: 0 },
    ];

    Alert.alert('自动锁定时间', '应用切到后台多久后自动锁定？', [
      ...options.map((opt) => ({
        text: opt.label,
        onPress: () => setAutoLockTimeout(opt.value),
      })),
      { text: '取消' },
    ]);
  };

  const handleClipboardChange = () => {
    const options = [
      { label: '30 秒（推荐）', value: 30 },
      { label: '60 秒', value: 60 },
      { label: '不自动清除', value: 0 },
    ];

    Alert.alert('剪贴板清除时间', '复制密码后多久自动清除剪贴板？', [
      ...options.map((opt) => ({
        text: opt.label,
        onPress: () => setClipboardClearTimeout(opt.value),
      })),
      { text: '取消' },
    ]);
  };

  const handleChangePassword = () => {
    setShowChangePwdPrompt(true);
  };

  const handleDedup = () => {
    Alert.alert(
      '一键去重',
      '将扫描所有记录，相同来源+账号的重复记录只保留最新一条。是否继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '去重',
          style: 'destructive',
          onPress: () => {
            const deleted = deduplicateRecords();
            Alert.alert('去重完成', `已删除 ${deleted} 条重复记录。`);
          },
        },
      ],
    );
  };

  const handleExport = () => {
    Alert.alert(
      '导出全部记录',
      '密码将以明文导出，请选择格式：',
      [
        { text: 'CSV', onPress: () => { setPendingExportFormat('csv'); setShowExportPrompt(true); } },
        { text: 'JSON', onPress: () => { setPendingExportFormat('json'); setShowExportPrompt(true); } },
        { text: '取消', style: 'cancel' },
      ],
    );
  };

  const doExport = async () => {
    setShowExportPrompt(false);
    try {
      await exportSelected(pendingExportFormat);
    } catch (e: any) {
      Alert.alert('导出失败', e?.message ?? '未知错误');
    }
  };

  const handleLock = () => {
    lock();
  };

  const handleAbout = () => {
    Alert.alert(
      '关于密码保险箱',
      '版本 1.0.0\n\n' +
        '一款安全、便捷的移动端密码管理应用。\n\n' +
        '• 所有数据使用 AES-256 加密存储在本地\n' +
        '• 支持生物识别快速解锁\n' +
        '• 智能识别剪贴板账号密码\n' +
        '• 自动锁定保护数据安全\n\n' +
        '数据仅存储在您的设备本地，不会上传到任何服务器。'
    );
  };

  const formatSeconds = (seconds: number): string => {
    if (seconds === 0) return '从不';
    if (seconds < 60) return `${seconds} 秒`;
    return `${seconds / 60} 分钟`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* 安全设置 */}
        <Text style={styles.sectionTitle}>安全</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>修改主密码</Text>
              <Text style={styles.settingDescription}>
                验证旧密码后设置新的主密码
              </Text>
            </View>
            <Text style={styles.chevron}>🔑</Text>
          </TouchableOpacity>
          <View style={styles.divider} />

          {hasBiometric && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{biometricTypeName}解锁</Text>
                <Text style={styles.settingDescription}>
                  使用设备{biometricTypeName}快速解锁应用
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{
                  false: Colors.light.textTertiary,
                  true: Colors.light.primary + '60',
                }}
                thumbColor={biometricEnabled ? Colors.light.primary : '#f4f3f4'}
              />
            </View>
          )}
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleAutoLockChange}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>自动锁定</Text>
              <Text style={styles.settingDescription}>
                应用进入后台后的锁定时间
              </Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.valueText}>
                {autoLockTimeout === 0 ? '从不' : formatSeconds(autoLockTimeout)}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClipboardChange}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>剪贴板清除</Text>
              <Text style={styles.settingDescription}>
                复制密码后的自动清除时间
              </Text>
            </View>
            <View style={styles.settingValue}>
              <Text style={styles.valueText}>
                {clipboardClearTimeout === 0
                  ? '不自动清除'
                  : formatSeconds(clipboardClearTimeout)}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 操作 */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          操作
        </Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingRow} onPress={handleExport}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>导出全部记录</Text>
              <Text style={styles.settingDescription}>
                导出为 CSV 或 JSON 文件，通过系统分享发送
              </Text>
            </View>
            <Text style={styles.chevron}>📤</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={handleDedup}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>一键去重</Text>
              <Text style={styles.settingDescription}>
                删除重复记录，相同来源+账号只保留最新
              </Text>
            </View>
            <Text style={styles.chevron}>🧹</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={handleLock}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>立即锁定</Text>
              <Text style={styles.settingDescription}>
                手动锁定应用，需要重新输入主密码
              </Text>
            </View>
            <Text style={styles.chevron}>🔒</Text>
          </TouchableOpacity>
        </View>

        {/* 关于 */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>
          关于
        </Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingRow} onPress={handleAbout}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>关于密码保险箱</Text>
              <Text style={styles.settingDescription}>
                版本信息与技术说明
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          密码保险箱 v1.0.0{'\n'}
          数据安全 · 本地加密 · 开源透明
        </Text>
      </ScrollView>

      <PasswordPrompt
        visible={showExportPrompt}
        title="验证身份"
        message="导出明文密码需要验证主密码"
        onConfirm={doExport}
        onCancel={() => setShowExportPrompt(false)}
      />

      <ChangePasswordModal
        visible={showChangePwdPrompt}
        onClose={() => setShowChangePwdPrompt(false)}
      />
    </SafeAreaView>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.light.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginRight: Spacing.xs,
  },
  chevron: {
    fontSize: FontSize.xl,
    color: Colors.light.textTertiary,
    fontWeight: '300',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
    marginLeft: Spacing.lg,
  },
  footer: {
    textAlign: 'center',
    color: Colors.light.textTertiary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xxxl,
    lineHeight: 18,
  },
});
