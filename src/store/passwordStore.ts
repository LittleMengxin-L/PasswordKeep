// ============================================================
// 密码保险箱 — 密码记录状态管理 (Zustand)
// ============================================================

import { create } from 'zustand';
import { PasswordRecord, CreatePasswordRecord, UpdatePasswordRecord, SortField, SortDirection } from '../types';
import * as DB from '../services/database';
import { encrypt, decrypt } from '../services/crypto';
import { exportRecords } from '../services/exportService';
import { useAuthStore } from './authStore';

interface PasswordState {
  // 数据
  records: PasswordRecord[];
  decryptedPasswords: Map<number, string>; // 内存中的明文密码缓存

  // UI 状态
  searchQuery: string;
  selectedCategory: string;
  sortField: SortField;
  sortDirection: SortDirection;
  isEditMode: boolean;
  selectedIds: Set<number>;
  revealedPasswords: Set<number>; // 正在显示明文的密码 ID

  // 操作
  loadRecords: () => void;
  checkDuplicate: (source: string, account: string) => PasswordRecord | null;
  addRecord: (record: CreatePasswordRecord) => PasswordRecord;
  addRecordsBatch: (records: CreatePasswordRecord[]) => Promise<{ added: number; skipped: number }>;
  editRecord: (id: number, updates: UpdatePasswordRecord) => void;
  removeRecord: (id: number) => void;
  removeRecords: (ids: number[]) => void;

  // 密码显示/隐藏
  getDecryptedPassword: (id: number) => string;
  ensureDecrypted: (id: number) => void;
  togglePasswordReveal: (id: number) => void;
  hideAllPasswords: () => void;

  // 搜索/筛选/排序
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (dir: SortDirection) => void;

  // 导出
  exportSelected: (format?: 'csv' | 'json') => Promise<void>;

  // 去重
  deduplicateRecords: () => number;

  // 排序
  updateSortOrder: (id: number, newOrder: number) => void;

  // 选择模式
  toggleEditMode: () => void;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 过滤和排序后数据
  getFilteredRecords: () => PasswordRecord[];
}

export const usePasswordStore = create<PasswordState>((set, get) => ({
  records: [],
  decryptedPasswords: new Map(),
  searchQuery: '',
  selectedCategory: '',
  sortField: 'sortOrder' as SortField,
  sortDirection: 'asc' as SortDirection,
  isEditMode: false,
  selectedIds: new Set<number>(),
  revealedPasswords: new Set<number>(),

  // ---- 数据加载 ----

  loadRecords: () => {
    const rows = DB.getAllRecords();
    set({ records: rows, decryptedPasswords: new Map(), revealedPasswords: new Set() });
  },

  // ---- CRUD ----

  /** 检查重复：相同来源 + 相同账号 → 返回已存在的记录，否则 null */
  checkDuplicate: (source: string, account: string): PasswordRecord | null => {
    const { records } = get();
    const lowerSource = source.trim().toLowerCase();
    const lowerAccount = account.trim().toLowerCase();
    // 拆分多账号（/ 分隔），取子账号集合
    const subAccounts = new Set(lowerAccount.split('/').map(s => s.trim()).filter(Boolean));

    return (
      records.find((r) => {
        // 来源必须匹配
        if (r.source.trim().toLowerCase() !== lowerSource) return false;
        // 完整账号匹配
        if (r.account.trim().toLowerCase() === lowerAccount) return true;
        // 子账号交叉匹配：任一子账号重合即视为重复
        const existingSubs = r.account.trim().toLowerCase().split('/').map(s => s.trim()).filter(Boolean);
        return existingSubs.some(sub => subAccounts.has(sub));
      }) ?? null
    );
  },

  addRecord: (record: CreatePasswordRecord): PasswordRecord => {
    const aesKey = useAuthStore.getState().aesKey;
    if (!aesKey) throw new Error('应用未解锁');

    // 检查重复：相同来源+账号 → 更新密码而非新增
    const existing = get().checkDuplicate(record.source, record.account);
    if (existing) {
      const encryptedPassword = encrypt(record.password, aesKey);
      DB.updateRecord(existing.id, { password: record.password }, encryptedPassword);
      // 刷新内存数据
      const updated = DB.getRecordById(existing.id);
      if (updated) {
        set((state) => ({
          records: state.records.map((r) => (r.id === existing.id ? updated : r)),
        }));
        get().decryptedPasswords.delete(existing.id);
      }
      return updated ?? existing;
    }

    const encryptedPassword = encrypt(record.password, aesKey);
    const newRecord = DB.insertRecord(record, encryptedPassword);

    set((state) => ({
      records: [...state.records, newRecord],
    }));

    return newRecord;
  },

  /** 批量添加，自动跳过重复，分批执行避免卡死 */
  addRecordsBatch: async (records: CreatePasswordRecord[]): Promise<{ added: number; skipped: number }> => {
    let added = 0;
    let skipped = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      // 跳过密码为空的记录
      if (!record.password || !record.account) {
        skipped++;
        continue;
      }
      const existing = get().checkDuplicate(record.source, record.account);
      if (existing) {
        skipped++;
      } else {
        get().addRecord(record);
        added++;
      }
      // 每 20 条让出主线程，避免 Android ANR
      if (i % 20 === 19) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return { added, skipped };
  },

  editRecord: (id: number, updates: UpdatePasswordRecord) => {
    const aesKey = useAuthStore.getState().aesKey;
    if (!aesKey) throw new Error('应用未解锁');

    let encryptedPassword: string | undefined;
    if (updates.password !== undefined) {
      encryptedPassword = encrypt(updates.password, aesKey);
    }

    DB.updateRecord(id, updates, encryptedPassword);

    // 刷新内存数据
    const updated = DB.getRecordById(id);
    if (updated) {
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? updated : r)),
        decryptedPasswords: new Map(state.decryptedPasswords),
      }));
      // 清除该记录的明文缓存（因为密码可能已变）
      get().decryptedPasswords.delete(id);
    }
  },

  removeRecord: (id: number) => {
    DB.deleteRecord(id);
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedIds: (() => {
        const next = new Set(state.selectedIds);
        next.delete(id);
        return next;
      })(),
      decryptedPasswords: (() => {
        const next = new Map(state.decryptedPasswords);
        next.delete(id);
        return next;
      })(),
      revealedPasswords: (() => {
        const next = new Set(state.revealedPasswords);
        next.delete(id);
        return next;
      })(),
    }));
  },

  removeRecords: (ids: number[]) => {
    DB.deleteRecords(ids);
    const idSet = new Set(ids);
    set((state) => ({
      records: state.records.filter((r) => !idSet.has(r.id)),
      selectedIds: new Set<number>(),
      decryptedPasswords: (() => {
        const next = new Map(state.decryptedPasswords);
        ids.forEach((id) => next.delete(id));
        return next;
      })(),
      revealedPasswords: (() => {
        const next = new Set(state.revealedPasswords);
        ids.forEach((id) => next.delete(id));
        return next;
      })(),
    }));
  },

  // ---- 排序 ----

  updateSortOrder: (id: number, newOrder: number): void => {
    DB.updateSortOrder(id, newOrder);
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, sortOrder: newOrder } : r
      ),
    }));
  },

  // ---- 去重 ----

  /** 一键去重：相同来源+账号 → 只保留更新时间最新的那条，返回删除数量 */
  deduplicateRecords: (): number => {
    const { records } = get();
    const seen: PasswordRecord[] = [];
    const toDelete: number[] = [];

    for (const record of records) {
      // 用 checkDuplicate 的匹配逻辑检测是否与已见记录重复
      const lowerSource = record.source.trim().toLowerCase();
      const subAccounts = record.account.trim().toLowerCase().split('/').map(s => s.trim()).filter(Boolean);

      const dup = seen.find((s) => {
        if (s.source.trim().toLowerCase() !== lowerSource) return false;
        const existingSubs = s.account.trim().toLowerCase().split('/').map(a => a.trim()).filter(Boolean);
        return existingSubs.some(sub => subAccounts.includes(sub));
      });

      if (dup) {
        if (record.updatedAt > dup.updatedAt) {
          toDelete.push(dup.id);
          seen[seen.indexOf(dup)] = record;
        } else {
          toDelete.push(record.id);
        }
      } else {
        seen.push(record);
      }
    }

    if (toDelete.length > 0) {
      DB.deleteRecords(toDelete);
      const deleteSet = new Set(toDelete);
      set((state) => ({
        records: state.records.filter((r) => !deleteSet.has(r.id)),
      }));
    }

    return toDelete.length;
  },

  // ---- 导出 ----

  exportSelected: async (format: 'csv' | 'json' = 'csv'): Promise<void> => {
    const { records, selectedIds } = get();
    const aesKey = useAuthStore.getState().aesKey;
    if (!aesKey) throw new Error('应用未解锁');

    const toExport = selectedIds.size > 0
      ? records.filter((r) => selectedIds.has(r.id))
      : records;

    if (toExport.length === 0) throw new Error('没有可导出的记录');

    // 解密所有待导出记录的密码
    const decrypted = toExport.map((r) => {
      let plainPassword = '';
      try {
        plainPassword = decrypt(r.password, aesKey);
      } catch {
        plainPassword = '***';
      }
      return { ...r, password: plainPassword };
    });

    await exportRecords(decrypted, format);
  },

  // ---- 密码解密与显示 ----

  /** 纯读取：从缓存获取已解密的明文，不会触发 setState */
  getDecryptedPassword: (id: number): string => {
    const cached = get().decryptedPasswords.get(id);
    return cached ?? '';
  },

  /** 解密并缓存密码（在事件处理或 useEffect 中调用） */
  ensureDecrypted: (id: number): void => {
    const { decryptedPasswords, records } = get();
    if (decryptedPasswords.has(id)) return;

    const aesKey = useAuthStore.getState().aesKey;
    if (!aesKey) return;

    const record = records.find((r) => r.id === id);
    if (!record) return;

    try {
      const plaintext = decrypt(record.password, aesKey);
      set((state) => {
        if (state.decryptedPasswords.has(id)) return state;
        const next = new Map(state.decryptedPasswords);
        next.set(id, plaintext);
        return { decryptedPasswords: next };
      });
    } catch {
      set((state) => {
        const next = new Map(state.decryptedPasswords);
        next.set(id, '***');
        return { decryptedPasswords: next };
      });
    }
  },

  togglePasswordReveal: (id: number) => {
    const { decryptedPasswords, records } = get();

    // 预先解密（不在 set 内部，直接计算明文）
    let plaintext = decryptedPasswords.get(id) ?? '';
    if (!plaintext) {
      const aesKey = useAuthStore.getState().aesKey;
      if (aesKey) {
        const record = records.find((r) => r.id === id);
        if (record) {
          try {
            plaintext = decrypt(record.password, aesKey);
          } catch {
            plaintext = '***';
          }
        }
      }
    }

    // 单次 set：原子更新缓存 + 可见性
    set((state) => {
      const nextCache = new Map(state.decryptedPasswords);
      if (plaintext && !nextCache.has(id)) {
        nextCache.set(id, plaintext);
      }

      const nextRevealed = new Set(state.revealedPasswords);
      if (nextRevealed.has(id)) {
        nextRevealed.delete(id);
      } else {
        nextRevealed.add(id);
      }

      return {
        decryptedPasswords: nextCache,
        revealedPasswords: nextRevealed,
      };
    });
  },

  hideAllPasswords: () => {
    set({ revealedPasswords: new Set() });
  },

  // ---- 搜索/筛选/排序 ----

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category });
  },

  setSortField: (field: SortField) => {
    set({ sortField: field });
  },

  setSortDirection: (dir: SortDirection) => {
    set({ sortDirection: dir });
  },

  // ---- 选择模式 ----

  toggleEditMode: () => {
    set((state) => ({
      isEditMode: !state.isEditMode,
      selectedIds: new Set<number>(),
    }));
  },

  toggleSelect: (id: number) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    const filtered = get().getFilteredRecords();
    set({ selectedIds: new Set(filtered.map((r) => r.id)) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  // ---- 计算属性 ----

  getFilteredRecords: (): PasswordRecord[] => {
    const { records, searchQuery, selectedCategory, sortField, sortDirection } = get();

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
  },
}));
