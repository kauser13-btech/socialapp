import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Loading from '../components/ui/Loading';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Tab Screens
import FeedScreen from '../screens/feed/FeedScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Other Screens
import PreferenceCreateScreen from '../screens/preferences/PreferenceCreateScreen';
import PreferenceDetailScreen from '../screens/preferences/PreferenceDetailScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import GroupsScreen from '../screens/groups/GroupsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import CategoryScreen from '../screens/categories/CategoryScreen';
import ChatScreen from '../screens/messages/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab definition: name, label, Ionicons base name, screen component
const TABS = [
  { name: 'FeedTab',     label: 'Home',     icon: 'home',       component: FeedScreen },
  { name: 'DiscoverTab', label: 'Discover', icon: 'compass',    component: DiscoverScreen },
  { name: 'MessagesTab', label: 'Messages', icon: 'chatbubble', component: MessagesScreen },
  { name: 'ProfileTab',  label: 'Profile',  icon: 'person',     component: ProfileScreen },
];

function TabIcon({ icon, focused, color }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Ionicons
        name={focused ? icon : `${icon}-outline`}
        size={24}
        color={color}
      />
      {focused && <View style={[tabStyles.activeDot, { backgroundColor: color }]} />}
    </View>
  );
}

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      {TABS.map(({ name, label, icon, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon icon={icon} focused={focused} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});

function AuthStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  const { colors } = useTheme();
  const headerStyle = {
    headerStyle: { backgroundColor: colors.header },
    headerTintColor: colors.headerText,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  };
  return (
    <Stack.Navigator
      screenOptions={{ headerBackTitle: '', headerBackButtonDisplayMode: 'minimal' }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="PreferenceCreate" component={PreferenceCreateScreen} options={{ title: 'Create Preference', ...headerStyle }} />
      <Stack.Screen name="PreferenceDetail" component={PreferenceDetailScreen} options={{ title: 'Preference', ...headerStyle }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile', ...headerStyle }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends', ...headerStyle }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groups', ...headerStyle }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', ...headerStyle }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', ...headerStyle }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile', ...headerStyle }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={{ title: 'Category', ...headerStyle }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat', ...headerStyle }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.header,
      text: colors.headerText,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (loading) return <Loading fullScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
