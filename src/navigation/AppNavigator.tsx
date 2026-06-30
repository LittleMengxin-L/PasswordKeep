// ============================================================
// 密码保险箱 — 导航配置
// ============================================================

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { RootStackParamList, MainTabParamList, HomeStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useAppState } from '../hooks/useAppState';
import { initDatabase } from '../services/database';
import { Colors, FontSize, Spacing } from '../constants/theme';

// Screens
import SetupScreen from '../screens/SetupScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AddEditScreen from '../screens/AddEditScreen';
import PasswordDetailScreen from '../screens/PasswordDetailScreen';
import BatchImportScreen from '../screens/BatchImportScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// ---- Tab 图标 ----
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: focused ? '🔑' : '🗝',
    Settings: focused ? '⚙️' : '⚙',
  };
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
      {icons[label] ?? '📄'}
    </Text>
  );
}

// ---- Home Stack Navigator ----
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="PasswordList" component={HomeScreen} />
      <HomeStack.Screen
        name="AddEdit"
        component={AddEditScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <HomeStack.Screen
        name="PasswordDetail"
        component={PasswordDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <HomeStack.Screen
        name="BatchImport"
        component={BatchImportScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </HomeStack.Navigator>
  );
}

// ---- Main Tab Navigator ----
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.light.surface,
          borderTopColor: Colors.light.border,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '600',
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarLabel: '密码箱' }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '设置' }}
      />
    </MainTab.Navigator>
  );
}

// ---- Loading Screen ----
function LoadingScreen() {
  return (
    <View style={loadingStyles.container}>
      <Text style={loadingStyles.icon}>🔐</Text>
      <ActivityIndicator
        size="large"
        color={Colors.light.primary}
        style={{ marginTop: 20 }}
      />
      <Text style={loadingStyles.text}>加载中...</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  icon: {
    fontSize: 48,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
});

// ---- Root Navigator ----
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);

  const isFirstTime = useAuthStore((s) => s.isFirstTime);
  const isLocked = useAuthStore((s) => s.isLocked);
  const checkFirstTime = useAuthStore((s) => s.checkFirstTime);
  const loadSettings = useAuthStore((s) => s.loadSettings);

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        // 初始化数据库
        initDatabase();
        // 加载设置
        await loadSettings();
        // 检查首次使用
        await checkFirstTime();
      } catch (error) {
        // 继续，使用默认状态
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // 自动锁定 Hook
  useAppState();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstTime ? (
          // 首次使用 → 设置主密码
          <RootStack.Screen
            name="Setup"
            component={SetupScreen}
            options={{ animationTypeForReplace: 'push' }}
          />
        ) : isLocked ? (
          // 已设置但已锁定 → 登录
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationTypeForReplace: 'push' }}
          />
        ) : (
          // 已解锁 → 主界面
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
