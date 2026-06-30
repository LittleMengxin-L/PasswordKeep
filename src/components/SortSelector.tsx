// ============================================================
// 密码保险箱 — 排序选择器组件
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SortField, SortDirection } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';

interface SortSelectorProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onFieldChange: (field: SortField) => void;
  onDirectionChange: (dir: SortDirection) => void;
}

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: '默认顺序', value: 'sortOrder' },
  { label: '来源名称', value: 'source' },
  { label: '创建时间', value: 'createdAt' },
];

export default function SortSelector({
  sortField,
  sortDirection,
  onFieldChange,
  onDirectionChange,
}: SortSelectorProps) {
  const [visible, setVisible] = useState(false);

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? '默认顺序';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>排序: {currentLabel}</Text>
        <Text style={styles.directionIcon}>
          {sortDirection === 'asc' ? '↑' : '↓'}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>选择排序方式</Text>

            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.menuItem,
                  sortField === option.value && styles.menuItemActive,
                ]}
                onPress={() => {
                  onFieldChange(option.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    sortField === option.value && styles.menuItemTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortField === option.value && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            {/* 升序/降序切换 */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc');
                setVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>
                {sortDirection === 'asc' ? '⬆ 升序' : '⬇ 降序'}
              </Text>
              <Text style={styles.switchHint}>点击切换</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginRight: Spacing.xs,
  },
  directionIcon: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.mask,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  menu: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    width: '100%',
    ...Shadow.md,
  },
  menuTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuItemActive: {
    backgroundColor: Colors.light.primary + '10',
  },
  menuItemText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  menuItemTextActive: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: FontSize.xs,
    color: Colors.light.textTertiary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.sm,
  },
});
