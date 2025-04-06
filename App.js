// Import polyfills first
import './global';

import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet, Dimensions, Easing, Image } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

// Enable screens for better performance
enableScreens();

// Authentication & Firebase
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/utils/firebase';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider } from './src/context/TransactionContext';

// Theme
import theme from './src/theme';

// Screens - Auth
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

// Screens - Main App
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import AddBillScreen from './src/screens/AddBillScreen';

// Add Modal components
import AddTransactionModal from './src/components/AddTransactionModal';

// Notifications
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './src/utils/notificationUtils';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom NavigationTheme
const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background.light,
    primary: theme.colors.primary,
    card: theme.colors.background.card,
    text: theme.colors.text.primary,
    border: theme.colors.border,
    notification: '#FF4757',
  },
};

// Navigation stack for authenticated users
const AppTabs = () => {
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  const showAddModal = () => {
    setTimeout(() => {
      setAddModalVisible(true);
    }, 150);
  };

  const hideAddModal = () => {
    setAddModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Transactions') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Statistics') {
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            // Wrap icon in a container for better visual appearance
            return (
              <View style={focused ? styles.activeTabIcon : styles.tabIcon}>
                <Ionicons name={iconName} size={size} color={color} />
              </View>
            );
          },
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
          tabBarStyle: {
            height: 70,
            backgroundColor: '#1A1A1A',
            borderTopWidth: 0,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.3,
            shadowRadius: 18,
            elevation: 15,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            position: 'absolute',
            bottom: 0,
            paddingBottom: 10,
            paddingTop: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            paddingBottom: 4,
          },
          tabBarItemStyle: {
            paddingTop: 8,
            height: 70, // Match the container height
            justifyContent: 'center', // Ensure vertical centering
            alignItems: 'center', // Ensure horizontal centering
          },
        })}
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen 
          name="Statistics" 
          component={StatisticsScreen}
          options={{
            tabBarItemStyle: {
              marginLeft: 30,
              paddingTop: 8,
              height: 70, // Match the container height
              justifyContent: 'center', // Ensure vertical centering
              alignItems: 'center', // Ensure horizontal centering
            }
          }}
        />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Enhanced Floating Action Button with premium styling */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={showAddModal}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <LinearGradient
          colors={['#A095FF', '#7B70FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Add Transaction Modal */}
      <AddTransactionModal 
        visible={isAddModalVisible} 
        onClose={hideAddModal} 
      />
    </View>
  );
};

// Main navigation container with authentication state
const AppNavigator = () => {
  const { user, loading, onboardingRequired } = useAuth();
  const [initialRouteName, setInitialRouteName] = useState('Login');
  
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background.light }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavigationTheme}>
        {user ? (
          // User is authenticated
              <Stack.Navigator 
                screenOptions={{ headerShown: false }}
                initialRouteName={
                  !user.emailVerified 
                    ? "EmailVerification" 
                    : (onboardingRequired ? "Onboarding" : "Main")
                }
              >
                <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Main" component={AppTabs} />
                <Stack.Screen 
                  name="Budget" 
                  component={BudgetScreen} 
                  options={{ 
                    headerShown: true, 
                    title: 'Budget', 
                    headerTintColor: theme.colors.primary, 
                    headerBackTitle: ' ', 
                    headerStyle: { 
                      backgroundColor: theme.colors.background.card, 
                      shadowColor: theme.colors.shadow, 
                      shadowOffset: { width: 0, height: 2 }, 
                      shadowOpacity: 0.3, 
                      shadowRadius: 3, 
                      elevation: 3, 
                      borderBottomWidth: 0 
                    }, 
                    headerTitleStyle: { 
                      fontSize: theme.typography.fontSize.lg, 
                      fontWeight: theme.typography.fontWeight.semibold, 
                      color: theme.colors.text.primary 
                    } 
                  }} 
                />
          <Stack.Screen 
            name="TransactionDetail" 
            component={TransactionDetailScreen} 
            options={{ 
              headerShown: true, 
              title: 'Transaction Details', 
              headerTintColor: theme.colors.primary, 
              headerBackTitle: ' ', 
              headerStyle: { 
                backgroundColor: theme.colors.background.card, 
                shadowColor: theme.colors.shadow, 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 3, 
                elevation: 3, 
                borderBottomWidth: 0 
              }, 
              headerTitleStyle: { 
                fontSize: theme.typography.fontSize.lg, 
                fontWeight: theme.typography.fontWeight.semibold, 
                color: theme.colors.text.primary 
              } 
            }} 
          />
          <Stack.Screen 
            name="Add" 
            component={TransactionFormScreen} 
            options={{ 
              headerShown: true, 
              title: 'Add Transaction', 
              headerTintColor: theme.colors.primary, 
              headerBackTitle: ' ', 
              headerStyle: { 
                backgroundColor: theme.colors.background.card, 
                shadowColor: theme.colors.shadow, 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.3, 
                shadowRadius: 3, 
                elevation: 3, 
                borderBottomWidth: 0 
              }, 
              headerTitleStyle: { 
                fontSize: theme.typography.fontSize.lg, 
                fontWeight: theme.typography.fontWeight.semibold, 
                color: theme.colors.text.primary 
              } 
            }} 
          />
          <Stack.Screen 
            name="AddBill" 
            component={AddBillScreen} 
            options={{ 
              headerShown: false 
            }} 
          />
              </Stack.Navigator>
        ) : (
        // User is not authenticated - show auth screens
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </Stack.Navigator>
            )}
    </NavigationContainer>
  );
};

// Root component with all providers
export default function App() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [splashTimerComplete, setSplashTimerComplete] = useState(false);
  const [countdownTime, setCountdownTime] = useState(2);
  const [user, setUser] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure splash screen shows for at least 2 seconds with countdown
    const interval = setInterval(() => {
      setCountdownTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          setSplashTimerComplete(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup interval
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for authentication state changes
    try {
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        setUser(authUser);
        setFirebaseInitialized(true);
      }, (error) => {
        setInitError(error.message);
        setFirebaseInitialized(true);
      });

      // Cleanup subscription
      return () => unsubscribe();
    } catch (error) {
      setInitError(error.message);
      setFirebaseInitialized(true);
    }
  }, []);

  // Set up notifications
  useEffect(() => {
    const setupNotifications = async () => {
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      // Set up notification listener
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const { notification } = response;
        // Navigate to appropriate screen or show modal when notification is tapped
        // We can implement this later
      });
      
      return () => subscription.remove();
    };
    
    setupNotifications();
  }, []);

  if (!firebaseInitialized || !splashTimerComplete) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background.light 
      }}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={theme.colors.background.light}
          translucent={true}
        />
        <LinearGradient
          colors={['rgba(160, 149, 255, 0.15)', 'rgba(123, 112, 255, 0.08)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <Image 
          source={require('./assets/app-icon.png')} 
          style={{ width: 150, height: 150, marginBottom: 30 }}
          resizeMode="contain"
        />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 28, 
          color: theme.colors.text.primary,
          fontWeight: 'bold'
        }}>
          Expense Tracker
        </Text>
        <Text style={{ 
          marginTop: 10, 
          fontSize: 18, 
          color: theme.colors.text.secondary
        }}>
          Manage your finances with ease
        </Text>
        
        <View style={{ position: 'absolute', bottom: 50, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ 
            marginTop: 15, 
            fontSize: 14, 
            color: theme.colors.text.secondary,
            opacity: 0.8
          }}>
            Loading... {countdownTime > 0 ? `${countdownTime}s` : ''}
          </Text>
        </View>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.colors.background.light, 
        padding: 20 
      }}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={theme.colors.background.light}
          translucent={true}
        />
        <Ionicons name="alert-circle" size={50} color={theme.colors.status.error} />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 18, 
          color: theme.colors.text.primary, 
          fontWeight: 'bold',
          textAlign: 'center' 
        }}>
          Firebase Initialization Error
        </Text>
        <Text style={{ 
          marginTop: 10, 
          fontSize: 16, 
          color: theme.colors.text.secondary, 
          textAlign: 'center' 
        }}>
          {initError}
        </Text>
        <Text style={{ 
          marginTop: 20, 
          fontSize: 14, 
          color: theme.colors.text.muted, 
          textAlign: 'center' 
        }}>
          Please check your Firebase configuration and internet connection.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <AuthProvider>
      <TransactionProvider>
        <StatusBar 
            barStyle="light-content" 
          backgroundColor="transparent" 
            translucent={true}
        />
        <AppNavigator />
        <Toast />
      </TransactionProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    width: 65,
    height: 65,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D5FEF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 16,
    zIndex: 1000,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    marginBottom: 4,
    paddingTop: 0,
  },
  activeTabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(93, 95, 239, 0.15)',
    marginBottom: 4,
    paddingTop: 0,
  },
}); 