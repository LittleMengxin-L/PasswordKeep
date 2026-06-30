// ============================================================
// 密码保险箱 — 添加/编辑密码记录页面
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { HomeStackParamList, PasswordRecord, CreatePasswordRecord } from '../types';
import { usePasswordStore } from '../store/passwordStore';
import PasswordField from '../components/PasswordField';
import * as DB from '../services/database';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;
type AddEditRoute = RouteProp<HomeStackParamList, 'AddEdit'>;

export default function AddEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddEditRoute>();
  const recordId = route.params?.recordId;

  const isEditing = !!recordId;

  // Store
  const records = usePasswordStore((s) => s.records);
  const addRecord = usePasswordStore((s) => s.addRecord);
  const editRecord = usePasswordStore((s) => s.editRecord);

  // Form state
  const [source, setSource] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 如果是编辑模式，加载已有数据
  useEffect(() => {
    if (isEditing) {
      const existing = records.find((r) => r.id === recordId);
      if (existing) {
        setSource(existing.source);
        setAccount(existing.account);
        setNotes(existing.notes);
        setCategory(existing.category);
        // 编辑模式下密码字段留空，用户可选择性修改
      }
    }
  }, [isEditing, recordId, records]);

  const handleSave = async () => {
    // 验证
    if (!source.trim()) {
      Alert.alert('必填字段', '请输入来源（平台/应用名称）。');
      return;
    }
    if (!account.trim()) {
      Alert.alert('必填字段', '请输入账号。');
      return;
    }
    if (!isEditing && !password) {
      Alert.alert('必填字段', '请输入密码。');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && recordId) {
        const updates: { source?: string; account?: string; password?: string; notes?: string; category?: string } = {
          source: source.trim(),
          account: account.trim(),
          notes: notes.trim(),
          category: category.trim(),
        };
        // 仅当密码字段非空时才更新密码
        if (password) {
          updates.password = password;
        }
        editRecord(recordId, updates);
      } else {
        addRecord({
          source: source.trim(),
          account: account.trim(),
          password: password,
          notes: notes.trim(),
          category: category.trim(),
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('保存失败', '无法保存密码记录，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? '编辑记录' : '添加记录'}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>保存</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* 来源 */}
          <Text style={styles.label}>来源 *</Text>
          <TextInput
            style={styles.input}
            value={source}
            onChangeText={setSource}
            placeholder="如：GitHub、Google、淘宝"
            placeholderTextColor={Colors.light.textTertiary}
            autoFocus={!isEditing}
            maxLength={64}
          />

          {/* 账号 */}
          <Text style={styles.label}>账号 *</Text>
          <TextInput
            style={styles.input}
            value={account}
            onChangeText={setAccount}
            placeholder="邮箱 / 手机号 / 用户名"
            placeholderTextColor={Colors.light.textTertiary}
            keyboardType="email-address"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={128}
          />

          {/* 密码 */}
          <PasswordField
            label={`密码${isEditing ? '（留空则不修改）' : ' *'}`}
            value={password}
            onChangeText={setPassword}
            placeholder={isEditing ? '留空则不修改密码' : '请输入密码'}
          />

          {/* 分类 */}
          <Text style={styles.label}>分类标签</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="如：工作、个人、金融（可选）"
            placeholderTextColor={Colors.light.textTertiary}
            maxLength={32}
          />

          {/* 备注 */}
          <Text style={styles.label}>备注</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="备注信息（可选）"
            placeholderTextColor={Colors.light.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={256}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  closeBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  closeBtnText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  saveBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  form: {
    padding: Spacing.xl,
    paddingBottom: 80,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FontSize.lg,
    color: Colors.light.text,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
});
