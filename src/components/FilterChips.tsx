// ============================================================
// 密码保险箱 — 分类筛选标签组件
// ============================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface FilterChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

export default function FilterChips({
  categories,
  selectedCategory,
  onSelect,
}: FilterChipsProps) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            !selectedCategory && styles.chipActive,
          ]}
          onPress={() => onSelect('')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              !selectedCategory && styles.chipTextActive,
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              selectedCategory === cat && styles.chipActive,
            ]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat && styles.chipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
