// ============================================================
// 密码保险箱 — 密码显示/隐藏切换组件
// ============================================================

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface PasswordFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}

export default function PasswordField({
  value,
  onChangeText,
  placeholder = '请输入密码',
  label,
  readOnly = false,
  autoFocus = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            readOnly && styles.readOnly,
          ]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textTertiary}
          editable={!readOnly}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={128}
        />
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.toggleIcon}>{showPassword ? '🙈' : '显示'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FontSize.lg,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  readOnly: {
    color: Colors.light.textSecondary,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  toggleIcon: {
    fontSize: 20,
  },
});
