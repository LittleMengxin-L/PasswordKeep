// ============================================================
// 密码保险箱 — 密码详情查看页面
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { HomeStackParamList, PasswordRecord } from '../types';
import { usePasswordStore } from '../store/passwordStore';
import { useAuthStore } from '../store/authStore';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { copyToClipboard } from '../services/clipboard';
import ConfirmDialog from '../components/ConfirmDialog';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;
type DetailRoute = RouteProp<HomeStackParamList, 'PasswordDetail'>;

export default function PasswordDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRoute>();
  const { recordId } = route.params;

  // 禁止截屏
  useScreenCapture(true);

  // Store
  const records = usePasswordStore((s) => s.records);
  const getDecryptedPassword = usePasswordStore((s) => s.getDecryptedPassword);
  const ensureDecrypted = usePasswordStore((s) => s.ensureDecrypted);
  const removeRecord = usePasswordStore((s) => s.removeRecord);
  const clipboardClearTimeout = useAuthStore((s) => s.clipboardClearTimeout);

  // State
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const record = records.find((r) => r.id === recordId);

  // 切换密码可见性（先同步解密，再切换显示）
  const handleTogglePassword = () => {
    if (!isPasswordVisible && record) {
      ensureDecrypted(record.id);
    }
    setIsPasswordVisible(!isPasswordVisible);
  };

  // 离开页面时隐藏密码
  useEffect(() => {
    return () => {
      setIsPasswordVisible(false);
    };
  }, []);

  const accounts = record ? record.account.split('/').map(s => s.trim()).filter(Boolean) : [];
  const hasMultipleAccounts = accounts.length > 1;

  const handleCopyAccount = (account: string) => {
    copyToClipboard(account, clipboardClearTimeout);
    Alert.alert('已复制', '账号已复制到剪贴板');
  };

  const handleCopyPassword = () => {
    if (record) {
      ensureDecrypted(record.id);
      const plainPassword = getDecryptedPassword(record.id);
      if (plainPassword) {
        copyToClipboard(plainPassword, clipboardClearTimeout);
        Alert.alert('已复制', '密码已复制到剪贴板，将在短时间内自动清除');
      }
    }
  };

  const handleDelete = () => {
    if (record) {
      removeRecord(record.id);
      navigation.goBack();
    }
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>记录未找到</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const plainPassword = isPasswordVisible
    ? getDecryptedPassword(record.id) || '解密中...'
    : '••••••••••••';

  const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
    record.account
  );
  const isPhone = (() => {
    const cleaned = record.account.replace(/[\s\-()（）+]/g, '');
    return /^1[3-9]\d{9}$/.test(cleaned);
  })();

  const accountTypeLabel = isEmail
    ? '邮箱'
    : isPhone
    ? '手机号'
    : '用户名';

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>详情</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('AddEdit', { recordId: record.id })}
        >
          <Text style={styles.editBtnText}>编辑</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {/* 来源卡片 */}
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <Text style={styles.sourceIcon}>🏷️</Text>
            <View style={styles.sourceInfo}>
              <Text style={styles.cardLabel}>来源</Text>
              <Text style={styles.sourceText}>{record.source}</Text>
            </View>
          </View>
        </View>

        {/* 账号卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            账号{hasMultipleAccounts ? ` (${accounts.length}个)` : ''}
          </Text>
          {accounts.map((acc, i) => (
            <View key={i} style={styles.accountItem}>
              <Text style={styles.accountTypeIcon}>
                {/^[a-zA-Z0-9._%+-]+@/.test(acc) ? '📧' : /^1[3-9]\d{9}$/.test(acc.replace(/[\s\-()（）+]/g, '')) ? '📱' : '👤'}
              </Text>
              <Text style={styles.accountText} selectable>{acc}</Text>
              <TouchableOpacity
                style={styles.copyBtnSmall}
                onPress={() => handleCopyAccount(acc)}
              >
                <Text style={styles.copyBtnSmallText}>📋</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 密码卡片 */}
        <View style={[styles.card, styles.passwordCard]}>
          <Text style={styles.cardLabel}>密码</Text>
          <Text
            style={[
              styles.passwordText,
              !isPasswordVisible && styles.passwordHidden,
            ]}
            selectable={isPasswordVisible}
          >
            {plainPassword}
          </Text>
          <View style={styles.passwordActions}>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleTogglePassword}
            >
              <Text style={styles.copyBtnText}>
                {isPasswordVisible ? '🙈 隐藏密码' : '显示 显示密码'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyPassword}>
              <Text style={styles.copyBtnText}>📋 复制密码</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 元数据卡片 */}
        {(record.category || record.notes) && (
          <View style={styles.card}>
            {record.category ? (
              <>
                <Text style={styles.cardLabel}>分类标签</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{record.category}</Text>
                </View>
              </>
            ) : null}
            {record.notes ? (
              <>
                <Text style={[styles.cardLabel, { marginTop: Spacing.md }]}>
                  备注
                </Text>
                <Text style={styles.notesText}>{record.notes}</Text>
              </>
            ) : null}
          </View>
        )}

        {/* 时间信息 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>时间信息</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>创建时间</Text>
            <Text style={styles.timeValue}>
              {formatDateTime(record.createdAt)}
            </Text>
          </View>
          <View style={[styles.timeRow, { marginTop: Spacing.xs }]}>
            <Text style={styles.timeLabel}>更新时间</Text>
            <Text style={styles.timeValue}>
              {formatDateTime(record.updatedAt)}
            </Text>
          </View>
        </View>

        {/* 删除按钮 */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setShowDeleteConfirm(true)}
        >
          <Text style={styles.deleteBtnText}>🗑 删除此记录</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 删除确认 */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="删除记录"
        message={`确定要删除「${record.source}」这条密码记录吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />
    </SafeAreaView>
  );
}

// ---- 工具函数 ----

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${min}`;
  } catch {
    return isoString;
  }
}

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: FontSize.lg,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  backLink: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.primary,
  },
  editBtnText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  passwordCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.warning,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  sourceInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sourceText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.light.text,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  accountTypeIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  accountText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtnSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  copyBtnSmallText: {
    fontSize: 16,
  },
  passwordText: {
    fontSize: FontSize.lg,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: Spacing.md,
  },
  passwordHidden: {
    fontSize: FontSize.xxl,
    letterSpacing: 4,
    color: Colors.light.textTertiary,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  copyBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.inputBg,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary + '18',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  categoryText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  notesText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  timeValue: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
  },
  deleteBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.danger + '10',
    borderWidth: 1,
    borderColor: Colors.light.danger + '30',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: FontSize.md,
    color: Colors.light.danger,
    fontWeight: '600',
  },
});
