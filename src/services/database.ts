// ============================================================
// 密码保险箱 — 数据库服务 (expo-sqlite)
// ============================================================

import * as SQLite from 'expo-sqlite';
import { PasswordRecord, PasswordRow, CreatePasswordRecord, UpdatePasswordRecord } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

/** 获取数据库实例（单例） */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('password_vault.db');
  }
  return db;
}

/** 初始化数据库 — 创建表结构 */
export function initDatabase(): void {
  const database = getDatabase();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS passwords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      account TEXT NOT NULL,
      password TEXT NOT NULL,
      notes TEXT DEFAULT '',
      category TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 创建索引加速搜索
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_source ON passwords(source);
    CREATE INDEX IF NOT EXISTS idx_account ON passwords(account);
    CREATE INDEX IF NOT EXISTS idx_category ON passwords(category);
    CREATE INDEX IF NOT EXISTS idx_sort_order ON passwords(sort_order);
  `);
}

/** 将数据库行转换为 PasswordRecord */
function rowToRecord(row: PasswordRow): PasswordRecord {
  return {
    id: row.id,
    source: row.source,
    account: row.account,
    password: row.password, // 保持加密状态，由 store 层加解密
    notes: row.notes,
    category: row.category,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 获取最大 sort_order */
function getMaxSortOrder(): number {
  const database = getDatabase();
  const result = database.getFirstSync<{ max_order: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM passwords'
  );
  return result?.max_order ?? -1;
}

/** 添加一条密码记录 */
export function insertRecord(record: CreatePasswordRecord, encryptedPassword: string): PasswordRecord {
  const database = getDatabase();
  const now = new Date().toISOString();
  const nextOrder = getMaxSortOrder() + 1;

  const result = database.runSync(
    `INSERT INTO passwords (source, account, password, notes, category, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.source,
      record.account,
      encryptedPassword,
      record.notes ?? '',
      record.category ?? '',
      nextOrder,
      now,
      now,
    ]
  );

  return {
    id: result.lastInsertRowId,
    source: record.source,
    account: record.account,
    password: encryptedPassword,
    notes: record.notes ?? '',
    category: record.category ?? '',
    sortOrder: nextOrder,
    createdAt: now,
    updatedAt: now,
  };
}

/** 获取所有密码记录，按 sort_order 排序 */
export function getAllRecords(): PasswordRecord[] {
  const database = getDatabase();
  const rows = database.getAllSync<PasswordRow>(
    'SELECT * FROM passwords ORDER BY sort_order ASC'
  );
  return rows.map(rowToRecord);
}

/** 根据 ID 获取单条记录 */
export function getRecordById(id: number): PasswordRecord | null {
  const database = getDatabase();
  const row = database.getFirstSync<PasswordRow>(
    'SELECT * FROM passwords WHERE id = ?',
    [id]
  );
  return row ? rowToRecord(row) : null;
}

/** 更新一条密码记录 */
export function updateRecord(id: number, updates: UpdatePasswordRecord, encryptedPassword?: string): void {
  const database = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];

  if (updates.source !== undefined) {
    fields.push('source = ?');
    values.push(updates.source);
  }
  if (updates.account !== undefined) {
    fields.push('account = ?');
    values.push(updates.account);
  }
  if (encryptedPassword !== undefined) {
    fields.push('password = ?');
    values.push(encryptedPassword);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sortOrder);
  }

  values.push(id);
  database.runSync(
    `UPDATE passwords SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/** 删除一条记录 */
export function deleteRecord(id: number): void {
  const database = getDatabase();
  database.runSync('DELETE FROM passwords WHERE id = ?', [id]);
}

/** 批量删除记录 */
export function deleteRecords(ids: number[]): void {
  const database = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  database.runSync(
    `DELETE FROM passwords WHERE id IN (${placeholders})`,
    ids
  );
}

/** 搜索记录（按来源和账号模糊匹配） */
export function searchRecords(query: string): PasswordRecord[] {
  const database = getDatabase();
  const pattern = `%${query}%`;
  const rows = database.getAllSync<PasswordRow>(
    'SELECT * FROM passwords WHERE source LIKE ? OR account LIKE ? ORDER BY sort_order ASC',
    [pattern, pattern]
  );
  return rows.map(rowToRecord);
}

/** 按分类筛选记录 */
export function filterByCategory(category: string): PasswordRecord[] {
  const database = getDatabase();
  if (!category) {
    return getAllRecords();
  }
  const rows = database.getAllSync<PasswordRow>(
    'SELECT * FROM passwords WHERE category = ? ORDER BY sort_order ASC',
    [category]
  );
  return rows.map(rowToRecord);
}

/** 获取所有唯一的分类标签 */
export function getAllCategories(): string[] {
  const database = getDatabase();
  const rows = database.getAllSync<{ category: string }>(
    'SELECT DISTINCT category FROM passwords WHERE category != "" ORDER BY category ASC'
  );
  return rows.map(r => r.category);
}

/** 更新排序序号 */
export function updateSortOrder(id: number, newOrder: number): void {
  const database = getDatabase();
  database.runSync(
    'UPDATE passwords SET sort_order = ? WHERE id = ?',
    [newOrder, id]
  );
}

/** 获取记录总数 */
export function getRecordCount(): number {
  const database = getDatabase();
  const result = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM passwords'
  );
  return result?.count ?? 0;
}
