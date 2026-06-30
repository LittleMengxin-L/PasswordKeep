// ============================================================
// 密码保险箱 (Password Vault) — 类型定义
// ============================================================

/** 密码记录 — 核心数据模型 */
export interface PasswordRecord {
  id: number; // 自增主键
  source: string; // 来源（平台/应用名称）
  account: string; // 账号（邮箱/手机号/用户名）
  password: string; // 密码（DB 中为 AES 加密后的密文，内存中为明文）
  notes: string; // 备注
  category: string; // 分类标签
  sortOrder: number; // 排序序号
  createdAt: string; // ISO 时间戳
  updatedAt: string; // ISO 时间戳
}

/** 新建密码记录（不含自动生成字段） */
export interface CreatePasswordRecord {
  source: string;
  account: string;
  password: string;
  notes?: string;
  category?: string;
}

/** 更新密码记录 */
export interface UpdatePasswordRecord {
  source?: string;
  account?: string;
  password?: string;
  notes?: string;
  category?: string;
  sortOrder?: number;
}

/** 数据库中的原始行（password 字段为加密密文） */
export interface PasswordRow {
  id: number;
  source: string;
  account: string;
  password: string; // 加密密文
  notes: string;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 账号类型枚举 */
export type AccountType = 'email' | 'phone' | 'username' | 'unknown';

/** 排序字段 */
export type SortField = 'sortOrder' | 'source' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

/** 认证状态 */
export interface AuthState {
  isLocked: boolean;
  isFirstTime: boolean;
  aesKey: string | null; // AES 密钥仅存内存
  biometricEnabled: boolean;
  autoLockTimeout: number; // 秒
  clipboardClearTimeout: number; // 秒
}

/** 剪贴板解析结果 */
export interface ParsedEntry {
  account: string;
  password: string;
  source?: string;
  accountType: AccountType;
}

/** 应用设置 */
export interface AppSettings {
  biometricEnabled: boolean;
  autoLockTimeout: number;
  clipboardClearTimeout: number;
  isDarkMode: boolean;
}

/** 导航参数类型 */
export type RootStackParamList = {
  Setup: undefined;
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  PasswordList: undefined;
  AddEdit: { recordId?: number } | undefined;
  PasswordDetail: { recordId: number };
  BatchImport: undefined;
};
