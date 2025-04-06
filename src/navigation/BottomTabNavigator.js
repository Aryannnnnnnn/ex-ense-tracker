import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/HomeScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FloatingActionButton from '../components/FloatingActionButton';
import theme from '../constants/theme';

const Tab = createBottomTabNavigator();

const EmptyScreen = () => {
  return <View />;
};

const BottomTabNavigator = ({ navigation }) => {
  const handleAddTransaction = () => {
    navigation.navigate('Add');
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: styles.tabBarIcon,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="StatisticsTab"
          component={StatisticsScreen}
          options={{
            tabBarLabel: 'Statistics',
            tabBarIcon: ({ color, size }) => (
              <Icon name="chart-bar" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="AddTab"
          component={EmptyScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => null,
            tabBarButton: () => (
              <FloatingActionButton onPress={handleAddTransaction} />
            ),
          }}
        />
        <Tab.Screen
          name="TransactionsTab"
          component={TransactionsScreen}
          options={{
            tabBarLabel: 'Transactions',
            tabBarIcon: ({ color, size }) => (
              <Icon name="format-list-bulleted" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Icon name="account" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    height: 60,
    ...theme.shadows.medium,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 12,
    marginBottom: 0,
    marginTop: 3,
    textAlign: 'center',
  },
  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 5,
    flexDirection: 'column',
    height: 50,
  },
  tabBarIcon: {
    marginBottom: 0,
  },
});

export default BottomTabNavigator; 