import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { formatShortDate } from '../utils/formatters';

const TransactionItem = ({ transaction, onPress }) => {
  const { id, amount, category, date, note, type } = transaction;
  const categoryData = getCategoryById(category);
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(transaction)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: categoryData.color + '40' }
      ]}>
        <Ionicons name={categoryData.icon} color={categoryData.color} size={22} />
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {categoryData.name}
          </Text>
          <Text style={[
            styles.amount,
            type === 'expense' ? styles.expenseAmount : styles.incomeAmount,
          ]}>
            {type === 'expense' ? '-' : '+'}{formatCurrency(amount, currency)}
          </Text>
        </View>
        
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {note || 'No description'}
          </Text>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.text.muted} style={styles.dateIcon} />
            <Text style={styles.date}>{formatShortDate(date)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
    borderWidth: Platform.OS === 'ios' ? 0 : 0.5,
    borderColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  amount: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  expenseAmount: {
    color: theme.colors.financial.expense,
  },
  incomeAmount: {
    color: theme.colors.financial.income,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(160, 149, 255, 0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  dateIcon: {
    marginRight: 3,
  },
  date: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
});

export default TransactionItem; 