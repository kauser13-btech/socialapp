import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserProfileScreen from './UserProfileScreen';

export default function OwnUserProfileScreen({ navigation }) {
  const { user } = useAuth();
  const route = useMemo(() => ({ params: { username: user?.username } }), [user?.username]);
  return <UserProfileScreen route={route} navigation={navigation} />;
}
