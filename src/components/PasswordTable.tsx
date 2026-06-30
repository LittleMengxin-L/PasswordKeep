// ============================================================
// 密码保险箱 — 4列表格容器组件
// ============================================================

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { PasswordRecord } from '../types';
import { Colors, Spacing, FontSize } from '../constants/theme';
import PasswordRow from './PasswordRow';
import EmptyState from './EmptyState';

interface PasswordTableProps {
  records: PasswordRecord[];
  isEditMode: boolean;
  onRecordPress: (record: PasswordRecord) => void;
  onRecordLongPress: (record: PasswordRecord) => void;
  onToggleSelect: (id: number) => void;
}

const ITEM_HEIGHT = 52;

const MemoizedRow = memo(PasswordRow, (prev, next) => {
  return (
    prev.record.id === next.record.id &&
    prev.record.updatedAt === next.record.updatedAt &&
    prev.isEditMode === next.isEditMode
  );
});

export default memo(function PasswordTable({
  records,
  isEditMode,
  onRecordPress,
  onRecordLongPress,
  onToggleSelect,
}: PasswordTableProps) {
  const renderItem = useCallback(
    ({ item }: { item: PasswordRecord }) => (
      <MemoizedRow
        record={item}
        isEditMode={isEditMode}
        onPress={() =>
          isEditMode ? onToggleSelect(item.id) : onRecordPress(item)
        }
        onLongPress={() => onRecordLongPress(item)}
      />
    ),
    [isEditMode, onRecordPress, onRecordLongPress, onToggleSelect]
  );

  const keyExtractor = useCallback(
    (item: PasswordRecord) => String(item.id),
    []
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<PasswordRecord> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  if (records.length === 0) {
    return <EmptyState />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerCell, styles.orderHeaderCell]}>
          <Text style={styles.headerText}>
            {isEditMode ? '选择' : '#'}
          </Text>
        </View>
        <View style={[styles.headerCell, styles.sourceHeaderCell]}>
          <Text style={styles.headerText}>来源</Text>
        </View>
        <View style={[styles.headerCell, styles.accountHeaderCell]}>
          <Text style={styles.headerText}>账号</Text>
        </View>
        <View style={[styles.headerCell, styles.passwordHeaderCell]}>
          <Text style={styles.headerText}>密码</Text>
        </View>
      </View>

      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
});

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: Colors.light.headerBg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerCell: {
    justifyContent: 'center',
  },
  orderHeaderCell: {
    width: '10%' as const,
    alignItems: 'center',
  },
  sourceHeaderCell: {
    width: '22%' as const,
  },
  accountHeaderCell: {
    width: '30%' as const,
  },
  passwordHeaderCell: {
    width: '28%' as const,
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
});
