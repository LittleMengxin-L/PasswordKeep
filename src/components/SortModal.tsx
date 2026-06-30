// ============================================================
// 密码保险箱 — 拖拽排序模态窗
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { PasswordRecord } from '../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { usePasswordStore } from '../store/passwordStore';

interface SortModalProps {
  visible: boolean;
  records: PasswordRecord[];
  onClose: () => void;
}

const ITEM_H = 56;
const SCREEN_H = Dimensions.get('window').height;

export default function SortModal({ visible, records, onClose }: SortModalProps) {
  const updateSortOrder = usePasswordStore((s) => s.updateSortOrder);
  const loadRecords = usePasswordStore((s) => s.loadRecords);

  const [items, setItems] = useState<PasswordRecord[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const animY = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView>(null);
  const startIdx = useRef(-1);
  const startPageY = useRef(0);
  const dragIdx = useRef(-1);
  const currentY = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (visible) setItems([...records]);
  }, [visible, records]);

  // 每个手柄独立的 PanResponder
  const createPR = (idx: number) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dy) > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onMoveShouldSetPanResponderCapture: (_, gs) =>
      Math.abs(gs.dy) > 4 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (evt) => {
      startIdx.current = idx;
      dragIdx.current = idx;
      startPageY.current = evt.nativeEvent.pageY;
      animY.setValue(idx * ITEM_H);
      setDragging(idx);
    },
    onPanResponderMove: (evt) => {
      if (dragIdx.current < 0) return;
      const delta = evt.nativeEvent.pageY - startPageY.current;
      const y = startIdx.current * ITEM_H + delta;
      const clamped = Math.max(0, Math.min((itemsRef.current.length - 1) * ITEM_H, y));
      currentY.current = clamped;
      animY.setValue(clamped);
    },
    onPanResponderRelease: () => {
      if (dragIdx.current < 0) return;
      const cur = itemsRef.current;
      const targetIdx = Math.max(0, Math.min(cur.length - 1, Math.round(currentY.current / ITEM_H)));

      if (targetIdx !== dragIdx.current) {
        const next = [...cur];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(targetIdx, 0, moved);
        itemsRef.current = next;
        setItems(next);
      }

      const final = itemsRef.current;
      final.forEach((item, i) => updateSortOrder(item.id, i));
      loadRecords();

      setDragging(null);
      animY.setValue(0);
      currentY.current = 0;
      startIdx.current = -1;
      dragIdx.current = -1;
    },
    onPanResponderTerminate: () => {
      setDragging(null);
      dragIdx.current = -1;
    },
  });

  const prCache = useRef<Map<number, ReturnType<typeof PanResponder.create>>>(new Map());
  const getPR = (idx: number) => {
    if (!prCache.current.has(idx)) {
      prCache.current.set(idx, createPR(idx));
    }
    return prCache.current.get(idx)!;
  };
  useEffect(() => { prCache.current.clear(); }, [items]);

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setItems(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= items.length - 1) return;
    setItems(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    items.forEach((item, i) => updateSortOrder(item.id, i));
    loadRecords();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>拖拽排序</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>保存</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>按住 ⋮⋮ 拖拽排序 | ▲▼ 微调</Text>

          <ScrollView
            ref={scrollRef}
            style={styles.list}
            scrollEnabled={dragging === null}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: items.length * ITEM_H }}>
              {items.map((item, idx) => {
                const isDrag = dragging !== null && dragIdx.current === idx;
                return (
                  <Animated.View
                    key={item.id}
                    style={[
                      styles.item,
                      idx % 2 === 0 ? styles.even : styles.odd,
                      isDrag && styles.dragging,
                      {
                        top: isDrag ? animY : idx * ITEM_H,
                        zIndex: isDrag ? 999 : 1,
                      },
                    ]}
                  >
                    <View style={styles.handleWrap} {...getPR(idx).panHandlers}>
                      <View style={styles.handleInner}>
                        <Text style={styles.handleIcon}>⋮⋮</Text>
                      </View>
                    </View>
                    <View style={styles.body}>
                      <Text style={styles.src} numberOfLines={1}>{item.source}</Text>
                      <Text style={styles.acc} numberOfLines={1}>{item.account}</Text>
                    </View>
                    <View style={styles.btns}>
                      <TouchableOpacity style={styles.btn} onPress={() => moveUp(idx)} disabled={idx === 0}>
                        <Text style={[styles.btnText, idx === 0 && styles.btnOff]}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btn} onPress={() => moveDown(idx)} disabled={idx === items.length - 1}>
                        <Text style={[styles.btnText, idx === items.length - 1 && styles.btnOff]}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: {
    height: SCREEN_H * 0.78,
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border,
  },
  cancelText: { fontSize: FontSize.md, color: Colors.light.textSecondary },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.light.text },
  saveText: { fontSize: FontSize.md, color: Colors.light.primary, fontWeight: '700' },
  hint: {
    fontSize: FontSize.xs, color: Colors.light.textSecondary,
    textAlign: 'center', paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.headerBg,
  },
  list: { flex: 1 },
  item: {
    height: ITEM_H, flexDirection: 'row', alignItems: 'center',
    paddingRight: Spacing.sm, position: 'absolute', left: 0, right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border,
  },
  even: { backgroundColor: Colors.light.rowEven },
  odd: { backgroundColor: Colors.light.rowOdd },
  dragging: {
    backgroundColor: '#E8F0FE', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 6,
  },
  handleWrap: {
    width: 52, height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  handleInner: {
    width: 36, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
  },
  handleIcon: { fontSize: 20, color: Colors.light.textSecondary, letterSpacing: -3 },
  body: { flex: 1, marginRight: Spacing.sm },
  src: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.light.text },
  acc: { fontSize: FontSize.xs, color: Colors.light.textSecondary, marginTop: 1 },
  btns: { flexDirection: 'column', gap: 1 },
  btn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: Colors.light.inputBg },
  btnText: { fontSize: 10, color: Colors.light.primary },
  btnOff: { opacity: 0.2 },
});
