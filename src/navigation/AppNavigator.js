import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Loading from '../components/ui/Loading';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Tab Screens
import FeedScreen from '../screens/feed/FeedScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SavedScreen from '../screens/saved/SavedScreen';

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
import CollectionsScreen from '../screens/collections/CollectionsScreen';
import CollectionDetailScreen from '../screens/collections/CollectionDetailScreen';
import MapScreen from '../screens/map/MapScreen';
import TopRatedScreen from '../screens/toprated/TopRatedScreen';
import BadgesScreen from '../screens/badges/BadgesScreen';
import StoryViewerScreen from '../screens/stories/StoryViewerScreen';
import CreateStoryScreen from '../screens/stories/CreateStoryScreen';
import FriendRequestsScreen from '../screens/friends/FriendRequestsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab definition: name, label, Ionicons base name, screen component
const TABS = [
  { name: 'FeedTab',     label: 'Home',     icon: 'home',        component: FeedScreen },
  { name: 'DiscoverTab', label: 'Discover', icon: 'compass',     component: DiscoverScreen },
  { name: 'FriendsTab',  label: 'Friends',  icon: 'people',      component: FriendsScreen },
  { name: 'SavedTab',    label: 'My Prefs', icon: 'heart',       component: SavedScreen },
];

function TabIcon({ icon, focused, color, badge }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Ionicons
        name={focused ? icon : `${icon}-outline`}
        size={24}
        color={color}
      />
      {badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      {focused && <View style={[tabStyles.activeDot, { backgroundColor: color }]} />}
    </View>
  );
}

function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

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
          height: 56 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
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
              <TabIcon
                icon={icon}
                focused={focused}
                color={color}
                badge={0}
              />
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
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
      <Stack.Screen name="PreferenceDetail" component={PreferenceDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile', ...headerStyle }} />
      <Stack.Screen name="Collections" component={CollectionsScreen} options={{ title: 'Collections', ...headerStyle }} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ title: 'Collection', ...headerStyle }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groups', ...headerStyle }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', ...headerStyle }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', ...headerStyle }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile', ...headerStyle }} />
      <Stack.Screen name="Category" component={CategoryScreen} options={{ title: 'Category', ...headerStyle }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat', ...headerStyle }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TopRated" component={TopRatedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Badges" component={BadgesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', ...headerStyle }} />
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
