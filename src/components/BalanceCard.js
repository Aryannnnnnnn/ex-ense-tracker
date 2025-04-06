import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import theme from '../theme';
import { useTransactions } from '../context/TransactionContext';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const BalanceCard = ({ onPress }) => {
  const { stats } = useTransactions();
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  
  // Animation references
  const cardRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Run animation when component mounts
  useEffect(() => {
    // Card entrance animation
    cardRef.current?.animate(
      { 0: { scale: 0.95, opacity: 0.7 }, 1: { scale: 1, opacity: 1 } },
      { duration: 800, easing: 'ease-out' }
    );
    
    // Fade-in animation for content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <Animatable.View
      ref={cardRef}
      style={styles.container}
      animation="fadeInUp"
      duration={800}
      delay={300}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.touchable}
      >
        <View style={styles.cardContent}>
          <View style={styles.topContent}>
            <Text style={styles.title}>Current Balance</Text>
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={onPress}
            >
              <Ionicons name="add-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[styles.balanceContainer, { opacity: fadeAnim }]}>
            <Text style={styles.balanceAmount}>{formatCurrency(stats.balance, currency)}</Text>
            <Text style={styles.balancePeriod}>This Month</Text>
          </Animated.View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Animatable.View 
                style={styles.statIconContainer}
                animation="pulse" 
                iterationCount="infinite" 
                duration={2000}
              >
                <Ionicons name="arrow-down-outline" size={16} color="#4ADE80" />
              </Animatable.View>
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statValue, styles.incomeValue]}>
                  {formatCurrency(stats.income, currency)}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <Animatable.View 
                style={styles.statIconContainer}
                animation="pulse" 
                iterationCount="infinite" 
                duration={2000}
                delay={1000}
              >
                <Ionicons name="arrow-up-outline" size={16} color="#FB7185" />
              </Animatable.View>
              <View>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statValue, styles.expenseValue]}>
                  {formatCurrency(stats.expense, currency)}
                </Text>
              </View>
            </View>
          </View>
          
          <LinearGradient
            colors={['rgba(160, 149, 255, 0.1)', 'rgba(123, 112, 255, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientOverlay}
          />
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    height: 240,
    width: '92%',
    alignSelf: 'center',
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255, 255, 255, 0.3)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  touchable: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.xl,
  },
  topContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: '#333333',
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  moreButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(160, 149, 255, 0.1)',
    borderRadius: theme.borderRadius.full,
  },
  balanceContainer: {
    marginVertical: theme.spacing.md,
  },
  balanceAmount: {
    color: '#1A1A1A',
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  balancePeriod: {
    color: '#757575',
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(160, 149, 255, 0.08)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: 5,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(160, 149, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
  statLabel: {
    color: '#666666',
    fontSize: theme.typography.fontSize.xs,
    marginBottom: theme.spacing.xxs,
  },
  statValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  incomeValue: {
    color: '#4ADE80',
  },
  expenseValue: {
    color: '#FB7185',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: theme.spacing.md,
  },
});

export default BalanceCard; 