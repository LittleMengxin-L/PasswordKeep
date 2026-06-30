// ============================================================
// 密码保险箱 — 主页：密码列表 + 搜索 + FAB
// ============================================================

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { HomeStackParamList, PasswordRecord } from '../types';
import { usePasswordStore } from '../store/passwordStore';
import { useAuthStore } from '../store/authStore';
import { useClipboardMonitor } from '../hooks/useClipboardMonitor';
import PasswordTable from '../components/PasswordTable';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';
import SortSelector from '../components/SortSelector';
import ClipboardModal from '../components/ClipboardModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PasswordPrompt from '../components/PasswordPrompt';
import SortModal from '../components/SortModal';
import * as DB from '../services/database';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Store — subscribe to individual state slices for reactivity
  const loadRecords = usePasswordStore((s) => s.loadRecords);
  const removeRecord = usePasswordStore((s) => s.removeRecord);
  const removeRecords = usePasswordStore((s) => s.removeRecords);
  const searchQuery = usePasswordStore((s) => s.searchQuery);
  const setSearchQuery = usePasswordStore((s) => s.setSearchQuery);
  const selectedCategory = usePasswordStore((s) => s.selectedCategory);
  const setSelectedCategory = usePasswordStore((s) => s.setSelectedCategory);
  const sortField = usePasswordStore((s) => s.sortField);
  const sortDirection = usePasswordStore((s) => s.sortDirection);
  const setSortField = usePasswordStore((s) => s.setSortField);
  const setSortDirection = usePasswordStore((s) => s.setSortDirection);
  const isEditMode = usePasswordStore((s) => s.isEditMode);
  const toggleEditMode = usePasswordStore((s) => s.toggleEditMode);
  const selectedIds = usePasswordStore((s) => s.selectedIds);
  const toggleSelect = usePasswordStore((s) => s.toggleSelect);
  const selectAll = usePasswordStore((s) => s.selectAll);
  const clearSelection = usePasswordStore((s) => s.clearSelection);
  const hideAllPasswords = usePasswordStore((s) => s.hideAllPasswords);
  const exportSelected = usePasswordStore((s) => s.exportSelected);
  // Subscribe to records for reactivity when filtered data changes
  const records = usePasswordStore((s) => s.records);

  // Auth
  const lock = useAuthStore((s) => s.lock);

  // UI state
  const [recordToDelete, setRecordToDelete] = React.useState<PasswordRecord | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = React.useState(false);
  const [showExportPrompt, setShowExportPrompt] = React.useState(false);
  const [pendingExportFormat, setPendingExportFormat] = React.useState<'csv' | 'json'>('csv');
  const [showSortModal, setShowSortModal] = React.useState(false);

  // 编辑模式或排序面板开启时禁用导航侧滑，改为退出编辑/关闭面板
  React.useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ gestureEnabled: !isEditMode && !showSortModal });
    }
    return () => {
      parent?.setOptions({ gestureEnabled: true });
    };
  }, [isEditMode, showSortModal, navigation]);

  // Android 返回键：编辑模式下退出编辑，而非返回上一页
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isEditMode) return;
      e.preventDefault();
      toggleEditMode();
    });
    return unsubscribe;
  }, [navigation, isEditMode, toggleEditMode]);

  // Clipboard monitor
  const clipboardResult = useClipboardMonitor();

  // 每次页面获得焦点时重新加载数据
  useFocusEffect(
    useCallback(() => {
      loadRecords();
      hideAllPasswords();
    }, [loadRecords, hideAllPasswords])
  );

  // 获取分类列表
  const categories = useMemo(() => DB.getAllCategories(), []);

  // 筛选后的记录 — 使用订阅的 state 值确保响应式更新
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.source.toLowerCase().includes(q) ||
          r.account.toLowerCase().includes(q)
      );
    }

    // 分类过滤
    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    // 排序
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'sortOrder':
          cmp = a.sortOrder - b.sortOrder;
          break;
        case 'source':
          cmp = a.source.localeCompare(b.source, 'zh-CN');
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [records, searchQuery, selectedCategory, sortField, sortDirection]);

  // 处理记录点击
  const handleRecordPress = useCallback(
    (record: PasswordRecord) => {
      navigation.navigate('PasswordDetail', { recordId: record.id });
    },
    [navigation]
  );

  // 处理记录长按 — 进入编辑模式
  const handleRecordLongPress = useCallback(
    (record: PasswordRecord) => {
      if (!isEditMode) {
        toggleEditMode();
        toggleSelect(record.id);
      }
    },
    [isEditMode, toggleEditMode, toggleSelect]
  );

  // 处理单条删除
  const handleDeleteRecord = useCallback(
    (record: PasswordRecord) => {
      setRecordToDelete(record);
    },
    []
  );

  const confirmSingleDelete = useCallback(() => {
    if (recordToDelete) {
      removeRecord(recordToDelete.id);
      setRecordToDelete(null);
    }
  }, [recordToDelete, removeRecord]);

  // 处理批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      setShowBatchDeleteConfirm(true);
    }
  }, [selectedIds]);

  const confirmBatchDelete = useCallback(() => {
    removeRecords(Array.from(selectedIds));
    setShowBatchDeleteConfirm(false);
    toggleEditMode();
  }, [selectedIds, removeRecords, toggleEditMode]);

  const handleExport = useCallback(() => {
    const count = selectedIds.size > 0 ? selectedIds.size : records.length;
    Alert.alert(
      '导出密码记录',
      `将导出 ${count} 条明文密码，选择格式：`,
      [
        { text: 'CSV', onPress: () => { setPendingExportFormat('csv'); setShowExportPrompt(true); } },
        { text: 'JSON', onPress: () => { setPendingExportFormat('json'); setShowExportPrompt(true); } },
        { text: '取消', style: 'cancel' },
      ],
    );
  }, [selectedIds, records.length]);

  const doExport = useCallback(async () => {
    setShowExportPrompt(false);
    try {
      await exportSelected(pendingExportFormat);
    } catch (e: any) {
      if (e?.message !== '没有可导出的记录') {
        Alert.alert('导出失败', e?.message ?? '未知错误');
      }
    }
  }, [pendingExportFormat, exportSelected]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>密码保险箱</Text>
        <View style={styles.topBarActions}>
          {isEditMode ? (
            <TouchableOpacity onPress={toggleEditMode} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>完成</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('BatchImport')}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>导入</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleEditMode} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={lock} style={styles.actionBtn}>
                <Text style={styles.lockBtnText}>🔒</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 编辑模式工具栏 */}
      {isEditMode && (
        <View style={styles.editToolbar}>
          <TouchableOpacity onPress={selectAll} style={styles.editBtn}>
            <Text style={styles.editBtnIcon}>☑</Text>
            <Text style={styles.editBtnLabel}>全选</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.editBtn}>
            <Text style={styles.editBtnIcon}>☰</Text>
            <Text style={styles.editBtnLabel}>排序</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={styles.editBtn}>
            <Text style={styles.editBtnIcon}>📤</Text>
            <Text style={styles.editBtnLabel}>导出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBatchDelete}
            style={[styles.editBtn, selectedIds.size === 0 && styles.editBtnDisabled]}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.editBtnIcon}>🗑</Text>
            <Text style={[styles.editBtnLabel, selectedIds.size === 0 && styles.editBtnLabelDisabled]}>
              删除{selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 搜索栏 */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* 筛选 + 排序 */}
      <View style={styles.filterRow}>
        <FilterChips
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <SortSelector
          sortField={sortField}
          sortDirection={sortDirection}
          onFieldChange={setSortField}
          onDirectionChange={setSortDirection}
        />
      </View>

      {/* 密码表格 */}
      <View style={styles.tableContainer}>
        <PasswordTable
          records={filteredRecords}
          isEditMode={isEditMode}
          onRecordPress={handleRecordPress}
          onRecordLongPress={handleRecordLongPress}
          onToggleSelect={toggleSelect}
        />
      </View>

      {/* FAB — 添加按钮 */}
      {!isEditMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddEdit', {})}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* 排序模态窗 */}
      <SortModal
        visible={showSortModal}
        records={filteredRecords}
        onClose={() => { setShowSortModal(false); loadRecords(); }}
      />

      {/* 剪贴板识别弹窗 */}
      {clipboardResult && clipboardResult.length > 0 && (
        <ClipboardModal entries={clipboardResult} />
      )}

      {/* 导出密码验证 */}
      <PasswordPrompt
        visible={showExportPrompt}
        title="验证身份"
        message="导出明文密码需要验证主密码"
        onConfirm={doExport}
        onCancel={() => setShowExportPrompt(false)}
      />

      {/* 单条删除确认 */}
      <ConfirmDialog
        visible={!!recordToDelete}
        title="删除记录"
        message={`确定要删除「${recordToDelete?.source ?? ''}」这条密码记录吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmSingleDelete}
        onCancel={() => setRecordToDelete(null)}
        destructive
      />

      {/* 批量删除确认 */}
      <ConfirmDialog
        visible={showBatchDeleteConfirm}
        title="批量删除"
        message={`确定要删除选中的 ${selectedIds.size} 条密码记录吗？此操作不可恢复。`}
        confirmText="全部删除"
        cancelText="取消"
        onConfirm={confirmBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        destructive
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  appTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.light.text,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  // 编辑模式工具栏
  editToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: Spacing.xs,
  },
  editBtnIcon: {
    fontSize: 16,
  },
  editBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  editBtnLabelDisabled: {
    color: Colors.light.textTertiary,
  },
  editBtnDisabled: {
    opacity: 0.45,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.primary,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: Colors.light.danger,
  },
  deleteBtnText: {
    color: Colors.light.danger,
  },
  disabledText: {
    opacity: 0.4,
  },
  lockBtnText: {
    fontSize: FontSize.lg,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.fab,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
