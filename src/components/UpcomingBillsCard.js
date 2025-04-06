import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getUpcomingBills, checkFirestorePermissions } from '../utils/notificationUtils';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import theme from '../theme';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useFocusEffect } from '@react-navigation/native';

const UpcomingBillsCard = ({ navigation }) => {
  const { user } = useAuth();
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  
  // Refresh bills when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Refresh bills when the component mounts and when the screen comes into focus
      loadBills();
      
      return () => {
        // Clean up if needed
      };
    }, [])
  );
  
  const loadBills = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(false);
      
      // Check permissions first
      const hasPermissions = await checkFirestorePermissions(user.id);
      if (!hasPermissions) {
        setError(true);
        setHasPermission(false);
        return;
      }
      
      const bills = await getUpcomingBills(user.id);
      setUpcomingBills(bills);
      setHasPermission(true);
    } catch (error) {
      setError(true);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBill = () => {
    navigation.navigate('AddBill');
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Bills</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBill}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Bills</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBill}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.status.warning} />
          <Text style={styles.errorText}>Unable to load bills</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadBills}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (upcomingBills.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Bills</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBill}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={24} color={theme.colors.text.muted} />
          <Text style={styles.emptyText}>No upcoming bills found</Text>
          <TouchableOpacity 
            style={styles.addBillButton}
            onPress={handleAddBill}
          >
            <Text style={styles.addBillButtonText}>Add Your First Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Get the next 30 days of bills, or all if less than 30 days
  const displayedBills = expanded 
    ? upcomingBills 
    : upcomingBills.slice(0, Math.min(3, upcomingBills.length));
  
  const renderBillItem = ({ item }) => {
    const billDate = item.date instanceof Date ? item.date : new Date(item.date);
    
    return (
      <TouchableOpacity 
        style={styles.billItem}
        onPress={() => {
          if (navigation && !item.predicted) {
            // Navigate to transaction form with bill data for editing
            navigation.navigate('AddBill', { 
              billId: item.id,
              editMode: true,
              billData: {
                name: item.name,
                amount: Math.abs(item.amount),
                dueDate: billDate,
                frequency: item.frequency || 'monthly',
                category: item.category || 'bills',
                type: item.type || 'expense'
              }
            });
          }
        }}
      >
        <View style={styles.billIconContainer}>
          <Ionicons name="document-text-outline" size={20} color={theme.colors.text.white} />
        </View>
        <View style={styles.billDetails}>
          <Text style={styles.billTitle} numberOfLines={1}>
            {item.name || item.note || item.description || 'Unnamed bill'}
          </Text>
          <Text style={styles.billDate}>{formatShortDate(billDate)}</Text>
        </View>
        <View style={styles.billAmountContainer}>
          <Text style={styles.billAmount}>
            {formatCurrency(Math.abs(item.amount), user?.currency || 'USD')}
          </Text>
          {item.recurring && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>Recurring</Text>
            </View>
          )}
          {item.predicted && (
            <View style={[styles.tagContainer, styles.predictedTag]}>
              <Text style={styles.tagText}>Predicted</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Bills</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBill}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.viewAll}>
              {expanded ? 'Show Less' : 'View All'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={displayedBills}
        renderItem={renderBillItem}
        keyExtractor={(item, index) => item.id || `bill-${index}`}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
      
      {!expanded && upcomingBills.length > 3 && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(true)}
        >
          <Text style={styles.expandButtonText}>
            {upcomingBills.length - 3} more bills
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  viewAll: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  addBillButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  addBillButtonText: {
    color: theme.colors.text.white,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  billIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.financial.expense,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  billDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  billTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  billDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  billAmountContainer: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.financial.expense,
    marginBottom: 2,
  },
  tagContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 4,
  },
  predictedTag: {
    backgroundColor: theme.colors.financial.investment + '20',
  },
  tagText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  expandButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  errorContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  retryButtonText: {
    color: theme.colors.text.white,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default UpcomingBillsCard; 