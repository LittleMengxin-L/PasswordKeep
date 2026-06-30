// ============================================================
// 密码保险箱 — 主题常量
// ============================================================

export const Colors = {
  // 浅色主题
  light: {
    background: '#F5F5F7',
    surface: '#FFFFFF',
    primary: '#007AFF',
    primaryDark: '#0056CC',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    border: '#E5E5EA',
    danger: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    headerBg: '#F0F0F5',
    rowEven: '#FFFFFF',
    rowOdd: '#F9F9FB',
    fab: '#007AFF',
    mask: 'rgba(0,0,0,0.4)',
    inputBg: '#F2F2F7',
  },

  // 深色主题
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    text: '#FFFFFF',
    textSecondary: '#98989D',
    textTertiary: '#48484A',
    border: '#38383A',
    danger: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
    headerBg: '#2C2C2E',
    rowEven: '#1C1C1E',
    rowOdd: '#262628',
    fab: '#0A84FF',
    mask: 'rgba(0,0,0,0.6)',
    inputBg: '#2C2C2E',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};

// 表格列宽比例
export const TABLE_COL_WIDTHS = {
  order: 0.08,   // 序号 8%
  source: 0.22,  // 来源 22%
  account: 0.30, // 账号 30%
  password: 0.25,// 密码 25%
  actions: 0.15, // 操作 15%
};

// 自动锁定默认时间（秒）
export const DEFAULT_AUTO_LOCK_TIMEOUT = 30;

// 剪贴板清除默认时间（秒）
export const DEFAULT_CLIPBOARD_CLEAR_TIMEOUT = 30;

// PBKDF2 迭代次数
export const PBKDF2_ITERATIONS = 10000;

// AES 密钥长度
export const AES_KEY_LENGTH = 256;
