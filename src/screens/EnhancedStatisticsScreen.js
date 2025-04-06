import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { useLoading } from '../hooks';
import { 
  createCategoryPieChartConfig, 
  createExpenseTrendLineChartConfig,
  createIncomeExpenseBarChartConfig,
  createTopCategoriesBarChartConfig,
  createDailySpendingChartConfig
} from '../utils/chartUtils';

// Import chart components based on your choice of charting library
// For example, with react-native-chart-kit:
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  ProgressChart 
} from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 220;

// Time periods for filtering
const TIME_PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '3months', label: '3 Months' },
  { id: '6months', label: '6 Months' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All Time' },
];

const EnhancedStatisticsScreen = () => {
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const { loading, startLoading, stopLoading } = useLoading();
  
  // State
  const [currency, setCurrency] = useState('USD');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [topCategories, setTopCategories] = useState(null);
  const [dailySpending, setDailySpending] = useState(null);
  
  // Financial summary
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    averageExpense: 0,
    largestExpense: 0,
    mostSpentCategory: ''
  });
  
  // Load user currency
  useEffect(() => {
    if (user && user.currency) {
      setCurrency(user.currency);
    }
  }, [user]);
  
  // Filter transactions based on selected time period
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    
    startLoading();
    
    try {
      const filtered = filterTransactionsByPeriod(transactions, selectedPeriod);
      setFilteredTransactions(filtered);
      
      // Generate chart data
      const pieConfig = createCategoryPieChartConfig(filtered, currency);
      setCategoryData(pieConfig.data);
      
      const months = selectedPeriod === 'week' ? 1 : 
                    selectedPeriod === 'month' ? 1 :
                    selectedPeriod === '3months' ? 3 :
                    selectedPeriod === '6months' ? 6 : 12;
                    
      const lineConfig = createExpenseTrendLineChartConfig(transactions, months, currency);
      setTrendData(lineConfig);
      
      const barConfig = createIncomeExpenseBarChartConfig(transactions, Math.min(months, 6), currency);
      setComparisonData(barConfig);
      
      const topConfig = createTopCategoriesBarChartConfig(filtered, 5, currency);
      setTopCategories(topConfig);
      
      const dailyConfig = createDailySpendingChartConfig(transactions, new Date(), currency);
      setDailySpending(dailyConfig);
      
      // Calculate financial summary
      calculateFinancialSummary(filtered);
    } catch (error) {
      console.error('Error processing statistics:', error);
    } finally {
      stopLoading();
    }
  }, [transactions, selectedPeriod]);
  
  // Filter transactions by time period
  const filterTransactionsByPeriod = (allTransactions, period) => {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        return [...allTransactions];
    }
    
    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= now;
    });
  };
  
  // Calculate financial summary from filtered transactions
  const calculateFinancialSummary = (filtered) => {
    if (!filtered || filtered.length === 0) {
      setSummary({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        averageExpense: 0,
        largestExpense: 0,
        mostSpentCategory: 'N/A'
      });
      return;
    }
    
    // Total income and expenses
    const income = filtered
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = filtered
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Average expense
    const expenseTransactions = filtered.filter(t => t.type === 'expense');
    const averageExpense = expenseTransactions.length > 0 
      ? expenses / expenseTransactions.length 
      : 0;
    
    // Largest expense
    const largestExpense = expenseTransactions.length > 0
      ? Math.max(...expenseTransactions.map(t => Math.abs(t.amount)))
      : 0;
    
    // Most spent category
    const expensesByCategory = expenseTransactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += Math.abs(t.amount);
      return acc;
    }, {});
    
    let mostSpentCategory = 'N/A';
    let maxAmount = 0;
    
    Object.entries(expensesByCategory).forEach(([category, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        mostSpentCategory = category;
      }
    });
    
    setSummary({
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      averageExpense,
      largestExpense,
      mostSpentCategory
    });
  };
  
  const chartConfig = {
    backgroundGradientFrom: theme.colors.background.card,
    backgroundGradientTo: theme.colors.background.card,
    color: (opacity = 1) => `rgba(160, 149, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeDasharray: '5, 5',
    },
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        
        {/* Time period filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {TIME_PERIODS.map(period => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.filterButton,
                selectedPeriod === period.id ? styles.activeFilter : null
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text 
                style={[
                  styles.filterText,
                  selectedPeriod === period.id ? styles.activeFilterText : null
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Financial Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Income</Text>
              <Text style={[styles.summaryValue, styles.incomeText]}>
                {formatCurrency(summary.totalIncome, currency)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, styles.expenseText]}>
                {formatCurrency(summary.totalExpenses, currency)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={[
                styles.summaryValue, 
                summary.balance >= 0 ? styles.incomeText : styles.expenseText
              ]}>
                {formatCurrency(summary.balance, currency)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg. Expense</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.averageExpense, currency)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Largest Expense</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.largestExpense, currency)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Top Category</Text>
              <Text style={styles.summaryValue}>{summary.mostSpentCategory}</Text>
            </View>
          </View>
        </View>
        
        {/* Expense by Category */}
        {categoryData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Expenses by Category</Text>
            
            <View style={styles.chartContainer}>
              <PieChart
                data={categoryData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          </View>
        )}
        
        {/* Income vs Expenses */}
        {comparisonData && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Income vs Expenses</Text>
            
            <View style={styles.chartContainer}>
              <BarChart
                data={comparisonData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                showBarTops={false}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          </View>
        )}
        
        {/* Expense Trend */}
        {trendData && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Expense Trend</Text>
            
            <View style={styles.chartContainer}>
              <LineChart
                data={trendData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                bezier
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          </View>
        )}
        
        {/* Daily Spending (current month) */}
        {dailySpending && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Daily Spending (This Month)</Text>
            
            <View style={styles.chartContainer}>
              <LineChart
                data={dailySpending}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                }}
                bezier
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: theme.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  filtersContainer: {
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.light,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Add extra padding at the bottom to ensure scrollability
  },
  summaryCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  incomeText: {
    color: theme.colors.financial.income,
  },
  expenseText: {
    color: theme.colors.financial.expense,
  },
  chartCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
  },
});

export default EnhancedStatisticsScreen; 