// ============================================================
// 密码保险箱 — 密码记录行组件
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { PasswordRecord } from '../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { usePasswordStore } from '../store/passwordStore';
import { copyToClipboard } from '../services/clipboard';
import { useAuthStore } from '../store/authStore';

interface PasswordRowProps {
  record: PasswordRecord;
  isEditMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/** 提取多账号列表（/ 分隔） */
function getAccounts(account: string): string[] {
  return account.split('/').map(s => s.trim()).filter(Boolean);
}

/** 格式化单个账号片段 */
function formatSingleAccount(part: string): string {
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
    return part;
  }
  const cleaned = part.replace(/[\s\-()（）+]/g, '');
  if (/^1[3-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(0, 3) + '****' + cleaned.slice(7);
  }
  return part;
}

/** 获取账号类型图标 */
function accountTypeIcon(part: string): string {
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) return '📧';
  const cleaned = part.replace(/[\s\-()（）+]/g, '');
  if (/^1[3-9]\d{9}$/.test(cleaned)) return '📱';
  return '👤';
}

export default function PasswordRow({
  record,
  isEditMode,
  onPress,
  onLongPress,
}: PasswordRowProps) {
  const revealedPasswords = usePasswordStore((s) => s.revealedPasswords);
  const decryptedPasswords = usePasswordStore((s) => s.decryptedPasswords);
  const selectedIds = usePasswordStore((s) => s.selectedIds);
  const getDecryptedPassword = usePasswordStore((s) => s.getDecryptedPassword);
  const ensureDecrypted = usePasswordStore((s) => s.ensureDecrypted);
  const togglePasswordReveal = usePasswordStore((s) => s.togglePasswordReveal);
  const clipboardClearTimeout = useAuthStore((s) => s.clipboardClearTimeout);

  const isSelected = selectedIds.has(record.id);

  const isRevealed = revealedPasswords.has(record.id);
  const accounts = getAccounts(record.account);
  const hasMultiple = accounts.length > 1;

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  React.useEffect(() => {
    if (isRevealed) {
      ensureDecrypted(record.id);
    }
  }, [isRevealed, record.id, ensureDecrypted]);

  const displayedPassword = isRevealed
    ? getDecryptedPassword(record.id) || '••••••••'
    : '••••••••';

  const handleCopyAccount = (account: string) => {
    copyToClipboard(account, clipboardClearTimeout);
    setShowAccountDropdown(false);
  };

  const handleCopyPassword = () => {
    ensureDecrypted(record.id);
    const plainPassword = getDecryptedPassword(record.id);
    if (plainPassword) {
      copyToClipboard(plainPassword, clipboardClearTimeout);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.row,
          isSelected && styles.rowSelected,
          record.id % 2 === 0 ? styles.rowEven : styles.rowOdd,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.6}
      >
        {/* 序号 */}
        {isEditMode && (
          <View style={[styles.cell, styles.checkCell]}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}
        {!isEditMode && (
          <View style={[styles.cell, styles.orderCell]}>
            <Text style={styles.orderText}>{record.sortOrder + 1}</Text>
          </View>
        )}

        {/* 来源 */}
        <View style={[styles.cell, styles.sourceCell]}>
          <Text style={styles.sourceText} numberOfLines={1}>
            {record.source}
          </Text>
        </View>

        {/* 账号 — 多账号时显示下拉触发区 */}
        <View style={[styles.cell, styles.accountCell]}>
          {hasMultiple ? (
            <TouchableOpacity
              style={styles.multiAccountTrigger}
              onPress={() => setShowAccountDropdown(true)}
            >
              <Text style={styles.accountText} numberOfLines={1}>
                {formatSingleAccount(accounts[0])}
              </Text>
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText}>+{accounts.length - 1}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.singleAccountBtn}
              onPress={() => handleCopyAccount(accounts[0])}
            >
              <Text style={styles.accountText} numberOfLines={1}>
                {formatSingleAccount(accounts[0])}
              </Text>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 密码 */}
        <TouchableOpacity
          style={[styles.cell, styles.passwordCell]}
          onPress={() => togglePasswordReveal(record.id)}
          onLongPress={handleCopyPassword}
        >
          <Text
            style={[
              styles.passwordText,
              !isRevealed && styles.passwordHidden,
            ]}
            numberOfLines={1}
          >
            {displayedPassword}
          </Text>
          <Text style={styles.eyeIcon}>{isRevealed ? '🙈' : '显示'}</Text>
        </TouchableOpacity>

      </TouchableOpacity>

      {/* 多账号下拉选择器 */}
      <Modal
        transparent
        visible={showAccountDropdown}
        animationType="fade"
        onRequestClose={() => setShowAccountDropdown(false)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowAccountDropdown(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>
              {record.source} — 账号列表
            </Text>
            {accounts.map((acc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.dropdownItem}
                onPress={() => handleCopyAccount(acc)}
              >
                <Text style={styles.dropdownIcon}>{accountTypeIcon(acc)}</Text>
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownAccountText} selectable>
                    {acc}
                  </Text>
                  <Text style={styles.dropdownHint}>点击复制</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.dropdownClose}
              onPress={() => setShowAccountDropdown(false)}
            >
              <Text style={styles.dropdownCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    minHeight: 52,
  },
  rowEven: { backgroundColor: Colors.light.rowEven },
  rowOdd: { backgroundColor: Colors.light.rowOdd },
  rowSelected: { backgroundColor: '#E8F0FE' },
  cell: { justifyContent: 'center' },
  checkCell: { width: '10%' as const, alignItems: 'center' },
  orderCell: { width: '10%' as const, alignItems: 'center' },
  sourceCell: { width: '22%' as const, paddingRight: Spacing.xs },
  accountCell: {
    width: '30%' as const,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.xs,
  },
  passwordCell: {
    width: '28%' as const,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.light.textTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  orderText: { fontSize: FontSize.sm, color: Colors.light.textSecondary, fontWeight: '500' },
  sourceText: { fontSize: FontSize.sm, color: Colors.light.text, fontWeight: '500' },
  accountText: { fontSize: FontSize.xs, color: Colors.light.textSecondary, flex: 1 },
  copyIcon: { fontSize: 12, marginLeft: 2 },
  passwordText: {
    fontSize: FontSize.xs, color: Colors.light.text,
    flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  passwordHidden: {
    fontSize: FontSize.md, letterSpacing: 2,
    color: Colors.light.textTertiary,
  },
  eyeIcon: { fontSize: 14, marginLeft: 2 },

  // 多账号
  multiAccountTrigger: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  singleAccountBtn: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  moreBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  moreBadgeText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
  },

  // 下拉弹窗
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dropdown: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxHeight: '60%',
  },
  dropdownTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.inputBg,
    marginBottom: Spacing.sm,
  },
  dropdownIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownAccountText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dropdownHint: {
    fontSize: FontSize.xs,
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  dropdownClose: {
    marginTop: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.inputBg,
    alignItems: 'center',
  },
  dropdownCloseText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
});
