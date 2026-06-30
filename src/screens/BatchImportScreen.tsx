// ============================================================
// 密码保险箱 — 批量导入页面
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { ParsedEntry } from '../types';
import { parseClipboardContent } from '../services/parser';
import { getClipboardContent } from '../services/clipboard';
import { usePasswordStore } from '../store/passwordStore';

export default function BatchImportScreen() {
  const navigation = useNavigation();
  const addRecordsBatch = usePasswordStore((s) => s.addRecordsBatch);
  const loadRecords = usePasswordStore((s) => s.loadRecords);

  const [inputText, setInputText] = useState('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [hasParsed, setHasParsed] = useState(false);

  // 从剪贴板读取
  const handlePasteFromClipboard = async () => {
    const content = await getClipboardContent();
    if (content) {
      setInputText(content);
      Alert.alert('已读取', '已从剪贴板读取内容，请点击"解析"按钮预览。');
    } else {
      Alert.alert('剪贴板为空', '请先复制包含账号密码的文本。');
    }
  };

  // 从文件导入
  const handleFileImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      let content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 如果是 JSON 文件，尝试提取账号密码数组
      if (file.name?.endsWith('.json') || file.mimeType === 'application/json') {
        try {
          const json = JSON.parse(content);
          if (Array.isArray(json)) {
            // 将 JSON 数组转为多行空格分隔格式
            content = json
              .map((item: any) =>
                [item.source ?? '', item.account ?? '', item.password ?? ''].join('\t')
              )
              .join('\n');
          }
        } catch {
          // 不是有效 JSON，保持原样
        }
      }

      setInputText(content);
      setHasParsed(false);
      Alert.alert('已读取', `已从文件 "${file.name}" 读取内容，请点击"解析"按钮预览。`);
    } catch (e: any) {
      Alert.alert('读取失败', e?.message ?? '无法读取文件');
    }
  };

  // 解析文本
  const handleParse = useCallback(() => {
    if (!inputText.trim()) {
      Alert.alert('提示', '请先输入或粘贴需要导入的文本内容。');
      return;
    }

    const entries = parseClipboardContent(inputText);
    if (entries.length === 0) {
      Alert.alert(
        '未识别到记录',
        '未能从文本中识别出账号密码组合。\n\n支持的格式：\n• 账号：xxx 密码：xxx\n• email@x.com ---- password\n• CSV/Tab分隔多列表格\n• username:password'
      );
      return;
    }

    setParsedEntries(entries);
    setSelectedIndices(new Set(entries.map((_, i) => i)));
    setHasParsed(true);
  }, [inputText]);

  // 切换选中
  const toggleEntry = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedEntries.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedEntries.map((_, i) => i)));
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (selectedIndices.size === 0) {
      Alert.alert('提示', '请至少选择一条记录进行导入。');
      return;
    }

    setIsImporting(true);
    try {
      // 先同步最新记录，确保去重准确
      loadRecords();

      const toImport = parsedEntries
        .filter((_, i) => selectedIndices.has(i))
        .map((entry) => ({
          source: entry.source ?? '未知来源',
          account: entry.account,
          password: entry.password,
          category: '',
          notes: `批量导入 - 格式: ${entry.accountType}`,
        }));

      const { added, skipped } = await addRecordsBatch(toImport);

      let msg = `成功导入 ${added} 条记录。`;
      if (skipped > 0) {
        msg += `\n跳过 ${skipped} 条重复记录（相同来源+账号已存在）。`;
      }

      Alert.alert('导入完成', msg, [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('导入失败', '保存记录时出错，请重试。');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>批量导入</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* 输入区 */}
        <Text style={styles.sectionTitle}>输入文本</Text>
        <Text style={styles.hint}>
          粘贴包含账号密码的文本，支持：键值对、分隔符、CSV/TSV、冒号分隔等格式
        </Text>

        <TextInput
          style={styles.textArea}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            setHasParsed(false);
          }}
          placeholder={`支持格式示例：\n\n账号：user@email.com 密码：abc123\n\n或 CSV 格式：\nGitHub,user@email.com,pass123\nGoogle,13800001111,mypassword\n\n或分隔符格式：\nuser@email.com ---- pass123`}
          placeholderTextColor={Colors.light.textTertiary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.pasteBtn}
            onPress={handlePasteFromClipboard}
          >
            <Text style={styles.pasteBtnText}>📋 剪贴板</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pasteBtn}
            onPress={handleFileImport}
          >
            <Text style={styles.pasteBtnText}>📂 选择文件</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.parseBtn} onPress={handleParse}>
            <Text style={styles.parseBtnText}>🔍 解析</Text>
          </TouchableOpacity>
        </View>

        {/* 预览区 */}
        {hasParsed && (
          <>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>
                预览 ({parsedEntries.length} 条)
              </Text>
              <TouchableOpacity onPress={toggleSelectAll}>
                <Text style={styles.selectAllText}>
                  {selectedIndices.size === parsedEntries.length
                    ? '取消全选'
                    : '全选'}
                </Text>
              </TouchableOpacity>
            </View>

            {parsedEntries.map((entry, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.entryRow,
                  selectedIndices.has(index) && styles.entryRowSelected,
                ]}
                onPress={() => toggleEntry(index)}
              >
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
                <View style={styles.entryInfo}>
                  <Text style={styles.entrySource} numberOfLines={1}>
                    {entry.source ?? '（未识别来源）'}
                  </Text>
                  <Text style={styles.entryAccount} numberOfLines={1}>
                    {entry.account}
                  </Text>
                  <Text style={styles.entryPassword} numberOfLines={1}>
                    {'•'.repeat(Math.min(entry.password.length, 16))}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* 导入按钮 */}
            <TouchableOpacity
              style={[
                styles.importBtn,
                (selectedIndices.size === 0 || isImporting) &&
                  styles.importBtnDisabled,
              ]}
              onPress={handleImport}
              disabled={selectedIndices.size === 0 || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.importBtnText}>
                  导入 {selectedIndices.size} 条记录
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 160,
    lineHeight: 20,
  },
  inputActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  pasteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.inputBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  pasteBtnText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontWeight: '500',
  },
  parseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  parseBtnText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  selectAllText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  entryRowSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '06',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  entryInfo: {
    flex: 1,
  },
  entrySource: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  entryAccount: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    marginBottom: 1,
  },
  entryPassword: {
    fontSize: FontSize.xs,
    color: Colors.light.textTertiary,
    letterSpacing: 1,
  },
  importBtn: {
    marginTop: Spacing.xl,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    ...Shadow.md,
  },
  importBtnDisabled: {
    backgroundColor: Colors.light.textTertiary,
    ...Shadow.sm,
  },
  importBtnText: {
    fontSize: FontSize.lg,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
