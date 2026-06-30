// ============================================================
// 密码保险箱 — 智能格式解析引擎
// ============================================================

import { ParsedEntry, AccountType } from '../types';

/**
 * 清理字段值：去首尾空格、去末尾标点符号（逗号、句号、分号等）
 * 这些标点通常是文本中的分隔符，不属于密码/账号本身
 */
function cleanField(value: string): string {
  let t = value.trim();
  // 去首尾引号（CSV 导出再导入的字段可能带引号）
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  // 去首尾标点
  return t.replace(/^[\s,，。；;：:！!？?、]+|[\s,，。；;：:！!？?、]+$/g, '').trim();
}

/** 判断字符串是否为邮箱格式 */
function isEmail(str: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
}

/** 判断字符串是否为手机号格式 */
function isPhone(str: string): boolean {
  // 中国大陆手机号：1 开头 + 10 位数字（共 11 位）
  const cleaned = str.replace(/[\s\-()（）+]/g, '');
  return /^1[3-9]\d{9}$/.test(cleaned);
}

/** 判断字符串是否为用户名格式 */
function isUsername(str: string): boolean {
  const trimmed = str.trim();
  // 用户名：不含 @，不是纯数字，长度 3-30
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 30 &&
    !trimmed.includes('@') &&
    !/^1[3-9]\d{9}$/.test(trimmed)
  );
}

/** 获取账号类型 */
function getAccountType(str: string): AccountType {
  if (isEmail(str)) return 'email';
  if (isPhone(str)) return 'phone';
  if (isUsername(str)) return 'username';
  return 'unknown';
}

// ============================================================
// 单条记录解析（单行文本）
// ============================================================

/**
 * 模式 1：中文键值对（2 字段 / 3 字段）
 * 示例：
 *   账号：xxx@email.com 密码：abc123
 *   手机号：13812345678，密码：abc123
 *   来源：GitHub 账号：user@email.com 密码：abc123
 */
function parseChineseKeyValue(text: string): ParsedEntry | null {
  const accountVariants = ['账号', '帐户', '用户名', '手机号', '邮箱', 'Email', 'email', '账户名'];
  const passwordVariants = ['密码', '口令', 'password', 'Password', '密碼'];
  const sourceVariants = ['来源', '平台', '应用', '名称', '网站', 'source', 'Source', 'app', 'App'];

  // ---- 3 字段模式：来源 + 账号 + 密码 ----
  for (const srcKey of sourceVariants) {
    for (const accKey of accountVariants) {
      for (const pwdKey of passwordVariants) {
        const patterns = [
          // 来源：xxx，账号：xxx，密码：xxx
          new RegExp(
            `${srcKey}[：:]\\s*(.+?)\\s*[，,;；]\\s*${accKey}[：:]\\s*(.+?)\\s*[，,;；]\\s*${pwdKey}[：:]\\s*(.+)`,
            'i'
          ),
          // 来源：xxx 账号：xxx 密码：xxx（空格分隔）
          new RegExp(
            `${srcKey}[：:]\\s*(.+?)\\s+${accKey}[：:]\\s*(.+?)\\s+${pwdKey}[：:]\\s*(.+)`,
            'i'
          ),
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const source = match[1].trim();
            const account = match[2].trim();
            const password = match[3].trim();
            if (account && password) {
              return {
                source: source || undefined,
                account,
                password,
                accountType: getAccountType(account),
              };
            }
          }
        }
      }
    }
  }

  // ---- 2 字段模式：账号 + 密码 ----
  for (const accKey of accountVariants) {
    for (const pwdKey of passwordVariants) {
      const patterns = [
        new RegExp(`${accKey}[：:]\\s*(.+?)\\s*[，,;；]\\s*${pwdKey}[：:]\\s*(.+)`, 'i'),
        new RegExp(`${accKey}[：:]\\s*(.+?)\\s+${pwdKey}[：:]\\s*(.+)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const account = match[1].trim();
          const password = match[2].trim();
          if (account && password) {
            return {
              account,
              password,
              accountType: getAccountType(account),
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * 模式 2：分隔符分隔
 * 示例：user@email.com ---- pass123
 *      user@email.com | pass123
 *      user@email.com\tpass123
 */
function parseWithSeparator(text: string): ParsedEntry | null {
  // 尝试用分隔符拆分
  const separators = [' ---- ', '----', ' | ', '|', '\t', '  ', ' - ', ' : '];

  for (const sep of separators) {
    const parts = text.split(sep);
    if (parts.length === 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();

      // 判断哪边是账号，哪边是密码
      const leftType = getAccountType(left);
      const rightType = getAccountType(right);

      if (leftType !== 'unknown' && rightType === 'unknown') {
        return { account: left, password: right, accountType: leftType };
      }
      if (rightType !== 'unknown' && leftType === 'unknown') {
        return { account: right, password: left, accountType: rightType };
      }
      // 如果都能识别或都不能识别，假设格式为 账号 分隔符 密码
      if (left && right && left.length >= 3 && right.length >= 1) {
        return { account: left, password: right, accountType: leftType };
      }
    }
  }

  // 尝试 Tab 分割（可能 2-3 列）
  const tabSplit = text.split('\t');
  if (tabSplit.length >= 2) {
    if (tabSplit.length >= 3) {
      // 3 列：来源\t账号\t密码
      const source = tabSplit[0].trim();
      const account = tabSplit[1].trim();
      const password = tabSplit[2].trim();
      if (account && password) {
        return {
          account,
          password,
          source: source || undefined,
          accountType: getAccountType(account),
        };
      }
    }
    // 2 列回退
    const account = tabSplit[0].trim();
    const password = tabSplit[1].trim();
    if (account && password) {
      return {
        account,
        password,
        accountType: getAccountType(account),
      };
    }
  }

  // 尝试 3 字段中文字符串：来源：X 账号：Y 密码：Z（已在 parseChineseKeyValue 中处理，此处作为补充）
  // 尝试提取 来源=xxx, 账号=yyy, 密码=zzz 这种松散格式
  const srcMatch = text.match(/(?:来源|平台|应用|名称)[：:]\s*(\S+)/i);
  const accMatch = text.match(/(?:账号|帐户|用户名|邮箱|手机号)[：:]\s*(\S+)/i);
  const pwdMatch = text.match(/(?:密码|口令)[：:]\s*(\S+)/i);

  if (accMatch && pwdMatch) {
    return {
      source: srcMatch?.[1] ?? undefined,
      account: accMatch[1],
      password: pwdMatch[1],
      accountType: getAccountType(accMatch[1]),
    };
  }

  return null;
}

/**
 * 模式 3：简单冒号分隔
 * 示例：username:password
 */
function parseColonSeparated(text: string): ParsedEntry | null {
  // 只有一行，且包含单个冒号
  const colonMatch = text.trim().match(/^(.+?):(.+)$/);
  if (!colonMatch) return null;

  const left = colonMatch[1].trim();
  const right = colonMatch[2].trim();

  // 确保不是 URL（不含 :// 和 /）
  if (text.includes('://') || text.includes('http')) return null;
  // 冒号左边不含空格（典型 key:value 格式）
  if (left.includes(' ')) return null;
  // 两边都有内容
  if (!left || !right) return null;

  const leftType = getAccountType(left);
  if (leftType !== 'unknown') {
    return { account: left, password: right, accountType: leftType };
  }

  return { account: left, password: right, accountType: 'username' };
}

// ============================================================
// 多行文本解析（批量）
// ============================================================

/**
 * 判断文本是否为中文或昵称（非账号）
 * 中文、纯英文短名（无@无数字）→ 昵称
 */
function isNickname(text: string): boolean {
  if (/[一-鿿]/.test(text)) return true;
  // 纯英文、无@、无数字、长度<15 → 可能是昵称
  if (/^[a-zA-Z_]{3,15}$/.test(text) && !/@/.test(text)) return true;
  return false;
}

/**
 * 模式 4：空格分隔的多列格式（用户密码表最常见）
 * 示例：
 *   车管所12123  17872630340  060610Lcy        → 3列：来源 账号 密码
 *   mcbbs  可爱的大佬  2524308589@qq.com  159357lcy → 4列：来源 昵称 账号 密码
 *   建行密码 060610                              → 2列：来源 密码
 */
function parseSpaceSeparated(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 按 2+ 空格或 Tab 优先分割
  let parts = trimmed.split(/[\t]{1,}|\s{2,}/);
  let cols = parts.map(p => p.trim()).filter(p => p.length > 0);

  // 如果多空格分割无效（只有单空格分隔），尝试智能拆分
  if (cols.length < 2) {
    // 查找行中的邮箱或手机号，以此为锚点拆分为 3 列
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    // 手机号（11位纯数字）或手机号+字母后缀（如 17872630340lcy）
    const phoneMatch = trimmed.match(/(1[3-9]\d{9}[a-zA-Z]*)/);
    // 18位身份证号
    const idMatch = trimmed.match(/(\d{17}[\dXx])/);
    const anchor = emailMatch || phoneMatch || idMatch;

    if (anchor && anchor.index !== undefined) {
      let before = trimmed.substring(0, anchor.index).trim();
      const account = anchor[1];
      let after = trimmed.substring(anchor.index! + account.length).trim();

      // 如果 before 还包含空格，拆出真正的来源（第一段）和昵称
      // 例如 "蛋壳塔科夫 嘿!打不着" → source="蛋壳塔科夫", nickname="嘿!打不着"
      const beforeParts = before.split(/\s+/);
      let nickname = '';
      if (beforeParts.length > 1) {
        nickname = beforeParts.slice(1).join(' ');
        before = beforeParts[0];
      }

      // 用户名/昵称放在 source 后、账号前
      if (before && after) {
        cols = nickname ? [before, nickname, account, after] : [before, account, after];
      } else if (before) {
        cols = nickname ? [before, nickname, account] : [before, account];
      }
    } else {
      // 没有邮箱/手机号，按最后一个空格分为 2 列
      const lastSpaceIdx = trimmed.lastIndexOf(' ');
      if (lastSpaceIdx > 0) {
        const source = trimmed.substring(0, lastSpaceIdx).trim();
        const rest = trimmed.substring(lastSpaceIdx + 1).trim();
        if (source && rest) {
          cols = [source, rest];
        }
      }
    }
  }

  // 如果还是只有1列但包含冒号（如 "steam:keaidedalaolcy  430407200106101516lcy"）
  if (cols.length < 2) return null;

  // 跳过纯标题行
  if (/^(来源|平台|账号|密码|序号|编号|source|account|password)\s*$/i.test(cols[0])) {
    return null;
  }

  // 处理来源列可能含冒号的情况（如 "steam:keaidedalaolcy"）
  let source = cols[0];
  // 如果来源列只有一个冒号且不是URL，拆分为 source 和 account
  if (source.includes(':') && !source.includes('://') && source.split(':').length === 2) {
    const [src, acc] = source.split(':');
    source = src.trim();
    // 把这个 account 插入到 cols 中
    cols = [source, acc.trim(), ...cols.slice(1)];
  }

  if (cols.length === 1) return null;

  if (cols.length === 2) {
    // 2 列：来源 + 密码/账号
    const second = cols[1];
    const secondType = getAccountType(second);
    // 如果第二列包含数字（可能是手机号衍生账号或密码），优先识别为账号
    if (secondType === 'email' || secondType === 'phone' || /\d/.test(second)) {
      return { source, account: second, password: '', accountType: secondType };
    }
    // 纯中文/纯英文 → 当作密码
    return { source, account: '', password: second, accountType: 'unknown' };
  }

  if (cols.length === 3) {
    // 3 列：来源 + 账号 + 密码
    const account = cols[1];
    const password = cols[2];
    return { source, account, password, accountType: getAccountType(account) };
  }

  // 4+ 列：来源 + 昵称 + 账号 + 密码
  // 找出哪一列像是账号（优先 email → phone → 其他）
  let accountIdx = 1;
  for (let i = 1; i < cols.length - 1; i++) {
    if (isEmail(cols[i]) || isPhone(cols[i])) {
      accountIdx = i;
      break;
    }
  }

  const account = cols[accountIdx];
  // 密码是账号后面的所有列拼接
  const password = cols.slice(accountIdx + 1).join(' ');

  return {
    source,
    account,
    password,
    accountType: getAccountType(account),
  };
}

/** 移除 CSV 字段首尾引号 */
function unquote(s: string): string {
  let t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }
  return t;
}

/**
 * 智能 CSV 解析（处理引号包裹字段、字段内逗号）
 */
function splitCSV(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * 模式 5：CSV / TSV 格式
 */
function parseCSVLine(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 跳过 BOM 和标题行
  if (/^(来源|平台|账号|密码|source|account|password|序号|编号)/i.test(trimmed.replace(/^﻿/, ''))) {
    return null;
  }

  // 智能 CSV 解析（处理引号），支持 3-5 列
  const commaParts = splitCSV(trimmed).map(unquote);
  if (commaParts.length >= 3) {
    const source = commaParts[0];
    const account = commaParts[1];
    // 密码只取第 3 列，备注和分类不混入密码
    const password = commaParts[2];
    if (account && password) {
      return {
        source: source || undefined,
        account,
        password,
        accountType: getAccountType(account),
      };
    }
    if (account && !password) {
      return {
        source: source || undefined,
        account,
        password: '',
        accountType: getAccountType(account),
      };
    }
  }

  // Tab 分隔（3+ 列）
  const tabParts = trimmed.split('\t').map(unquote);
  if (tabParts.length >= 3) {
    const source = tabParts[0];
    const account = tabParts[1];
    const password = tabParts.slice(2).join('\t');
    if (account && password) {
      return {
        source: source || undefined,
        account,
        password,
        accountType: getAccountType(account),
      };
    }
  }

  return null;
}

// ============================================================
// 公开接口
// ============================================================

/** 清理解析结果的字段（去首尾标点符号） */
function cleanEntry(entry: ParsedEntry): ParsedEntry {
  return {
    ...entry,
    source: entry.source ? cleanField(entry.source) : undefined,
    account: cleanField(entry.account),
    password: cleanField(entry.password),
  };
}

/**
 * 解析单行文本，尝试提取账号密码
 */
export function parseSingleLine(text: string): ParsedEntry | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 3) return null;

  let result: ParsedEntry | null = null;

  result = parseSpaceSeparated(trimmed);
  if (result) return cleanEntry(result);

  result = parseChineseKeyValue(trimmed);
  if (result) return cleanEntry(result);

  result = parseWithSeparator(trimmed);
  if (result) return cleanEntry(result);

  result = parseColonSeparated(trimmed);
  if (result) return cleanEntry(result);

  return null;
}

/**
 * 解析多行文本，逐行提取所有账号密码组合
 */
export function parseMultipleLines(text: string): ParsedEntry[] {
  const lines = text.split(/\r?\n/);

  // 首先尝试 CSV/TSV 模式（优先，因为 CSV 格式更精确）
  const csvResults = lines
    .map(parseCSVLine)
    .filter((r): r is ParsedEntry => r !== null)
    .map(cleanEntry);

  if (csvResults.length >= lines.length * 0.4) {
    return csvResults;
  }

  // 其次尝试空格多列格式
  const spaceResults = lines
    .map(parseSpaceSeparated)
    .filter((r): r is ParsedEntry => r !== null)
    .map(cleanEntry);

  if (spaceResults.length >= lines.length * 0.4) {
    return spaceResults;
  }

  // 逐行尝试其他单行解析
  const results: ParsedEntry[] = [];
  for (const line of lines) {
    const result = parseSingleLine(line);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 批量解析文本（主入口）
 */
export function parseClipboardContent(text: string): ParsedEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.includes('\n')) {
    const multiResults = parseMultipleLines(trimmed);
    if (multiResults.length > 0) return multiResults;
  }

  const singleResult = parseSingleLine(trimmed);
  if (singleResult) return [singleResult];

  const csvResult = parseCSVLine(trimmed);
  if (csvResult) return [cleanEntry(csvResult)];

  return [];
}
