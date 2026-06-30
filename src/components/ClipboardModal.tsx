// ============================================================
// 密码保险箱 — 剪贴板识别弹窗（半屏）
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { ParsedEntry } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { usePasswordStore } from '../store/passwordStore';

interface ClipboardModalProps {
  entries: ParsedEntry[];
}

export default function ClipboardModal({ entries }: ClipboardModalProps) {
  const [visible, setVisible] = useState(true);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(entries.map((_, i) => i))
  );
  const [isImporting, setIsImporting] = useState(false);

  const addRecordsBatch = usePasswordStore((s) => s.addRecordsBatch);
  const loadRecords = usePasswordStore((s) => s.loadRecords);

  const toggleEntry = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedIndices.size === 0) {
      Alert.alert('提示', '请至少选择一条记录进行导入。');
      return;
    }

    setIsImporting(true);
    try {
      // 先同步最新记录，确保去重准确
      loadRecords();

      const toImport = entries
        .filter((_, i) => selectedIndices.has(i))
        .map((entry) => ({
          source: entry.source ?? '未知来源',
          account: entry.account,
          password: entry.password,
          category: '',
          notes: '',
        }));

      const { added, skipped } = await addRecordsBatch(toImport);

      let msg = `成功导入 ${added} 条记录。`;
      if (skipped > 0) {
        msg += `\n跳过 ${skipped} 条重复记录。`;
      }
      Alert.alert('导入完成', msg);
      setVisible(false);
    } catch {
      Alert.alert('导入失败', '保存记录时出错，请重试。');
    } finally {
      setIsImporting(false);
    }
  }, [entries, selectedIndices, addRecordsBatch, loadRecords]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  const accountTypeLabel = (type: string): string => {
    switch (type) {
      case 'email': return '📧 邮箱';
      case 'phone': return '📱 手机号';
      case 'username': return '👤 用户名';
      default: return '📝 文本';
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 拖拽指示器 */}
          <View style={styles.handle} />

          <Text style={styles.title}>
            📋 检测到账号密码信息
          </Text>
          <Text style={styles.subtitle}>
            已从剪贴板识别到 {entries.length} 条记录，请勾选需要导入的内容：
          </Text>

          {/* 条目列表 */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {entries.map((entry, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.entryCard,
                  selectedIndices.has(index) && styles.entryCardSelected,
                ]}
                onPress={() => toggleEntry(index)}
                activeOpacity={0.7}
              >
                <View style={styles.checkboxArea}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedIndices.has(index) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedIndices.has(index) && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </View>

                <View style={styles.entryContent}>
                  <Text style={styles.entrySource} numberOfLines={1}>
                    {entry.source ?? '未识别来源'}
                  </Text>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>账号</Text>
                    <Text style={styles.entryValue} numberOfLines={1}>
                      {entry.account}
                    </Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>
                        {accountTypeLabel(entry.accountType)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>密码</Text>
                    <Text style={styles.entryValue} numberOfLines={1}>
                      {'•'.repeat(Math.min(entry.password.length, 12))}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 按钮 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleDismiss}
            >
              <Text style={styles.cancelText}>忽略</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.importButton,
                selectedIndices.size === 0 && styles.importButtonDisabled,
              ]}
              onPress={handleImport}
              disabled={selectedIndices.size === 0 || isImporting}
              activeOpacity={0.8}
            >
              <Text style={styles.importText}>
                {isImporting
                  ? '导入中...'
                  : `导入 (${selectedIndices.size})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.mask,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    ...Shadow.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  list: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  entryCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '08',
  },
  checkboxArea: {
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  entryContent: {
    flex: 1,
  },
  entrySource: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  entryLabel: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    width: 32,
  },
  entryValue: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.light.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: 10,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.inputBg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  importButton: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: Colors.light.textTertiary,
  },
  importText: {
    fontSize: FontSize.md,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
