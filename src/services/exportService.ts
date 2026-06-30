// ============================================================
// 密码保险箱 — 数据导出服务
// ============================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PasswordRecord } from '../types';

/**
 * 将记录导出为 CSV 字符串（BOM 头 + UTF-8）
 */
function toCsv(records: PasswordRecord[]): string {
  const bom = '﻿';
  const header = '来源,账号,密码,备注,分类';
  const rows = records.map((r) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [r.source, r.account, r.password, r.notes, r.category].map(escape).join(',');
  });
  return bom + [header, ...rows].join('\n');
}

/**
 * 将记录导出为 JSON 字符串
 */
function toJson(records: PasswordRecord[]): string {
  const data = records.map((r) => ({
    source: r.source,
    account: r.account,
    password: r.password,
    notes: r.notes,
    category: r.category,
  }));
  return JSON.stringify(data, null, 2);
}

/**
 * 导出密码记录到文件并打开系统分享
 */
export async function exportRecords(
  records: PasswordRecord[],
  format: 'csv' | 'json' = 'csv'
): Promise<void> {
  if (records.length === 0) {
    throw new Error('没有可导出的记录');
  }

  const content = format === 'csv' ? toCsv(records) : toJson(records);
  const ext = format === 'csv' ? 'csv' : 'json';
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';

  const fileName = `password_vault_export_${Date.now()}.${ext}`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: '导出密码记录',
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
    });
  } else {
    throw new Error('分享功能不可用');
  }
}
