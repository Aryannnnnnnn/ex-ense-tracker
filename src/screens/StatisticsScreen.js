import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionContext';
import theme from '../theme';
import { getCategoryById } from '../constants/categories';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreenWrapper from '../components/AnimatedScreenWrapper';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { format, subDays, subMonths, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

const StatisticsScreen = ({ navigation }) => {
  const { transactions, stats } = useTransactions();
  const [activeTab, setActiveTab] = useState('expense');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState({
    labels: [],
    datasets: [{ data: [] }]
  });

  useEffect(() => {
    setLoading(true);
    calculateCategoryStats();
    calculateTrendData();
    setLoading(false);
  }, [activeTab, periodFilter, transactions]);

  const getDateRangeForPeriod = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(periodFilter) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subMonths(now, 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }
    
    return { startDate, endDate: now };
  };

  const calculateCategoryStats = () => {
    const { startDate, endDate } = getDateRangeForPeriod();

    // Filter transactions by type and date
    const filteredTransactions = transactions.filter(
      (transaction) =>
        transaction.type === activeTab &&
        isWithinInterval(
          typeof transaction.date === 'string' ? parseISO(transaction.date) : new Date(transaction.date),
          { start: startDate, end: endDate }
        )
    );

    // Group by category and calculate totals
    const categoryTotals = {};
    let total = 0;

    filteredTransactions.forEach((transaction) => {
      const { category, amount } = transaction;
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = {
          id: category,
          total: 0,
          count: 0,
        };
      }
      
      categoryTotals[category].total += amount;
      categoryTotals[category].count += 1;
      total += amount;
    });

    // Convert to array and add percentage
    const statsArray = Object.values(categoryTotals).map((item) => ({
      ...item,
      percentage: total > 0 ? (item.total / total) * 100 : 0,
      categoryData: getCategoryById(item.id),
    }));

    // Sort by total amount (descending)
    statsArray.sort((a, b) => b.total - a.total);
    
    setCategoryStats(statsArray);
  };

  const calculateTrendData = () => {
    const { startDate, endDate } = getDateRangeForPeriod();
    const isPeriodYear = periodFilter === 'year';
    const isPeriodAll = periodFilter === 'all';
    const isPeriodWeek = periodFilter === 'week';
    
    // Get months or days to show based on period
    const dateLabels = [];
    const dataPoints = [];
    
    // Generate empty data structure based on period
    if (isPeriodWeek) {
      // For week, show each day
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        dateLabels.push(format(date, 'EEE'));
        dataPoints.push(0);
      }
    } else if (isPeriodYear || isPeriodAll) {
      // For year or all, show months
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        dateLabels.push(format(date, 'MMM'));
        dataPoints.push(0);
      }
    } else {
      // For month, show weeks
      for (let i = 3; i >= 0; i--) {
        const date = subDays(new Date(), i * 7);
        dateLabels.push(`W${i+1}`);
        dataPoints.push(0);
      }
    }
    
    // Aggregate transaction data into the appropriate time buckets
    const filteredTransactions = transactions.filter(
      (transaction) =>
        transaction.type === activeTab &&
        isWithinInterval(
          typeof transaction.date === 'string' ? parseISO(transaction.date) : new Date(transaction.date),
          { start: startDate, end: endDate }
        )
    );
    
    // Populate data points based on period
    filteredTransactions.forEach(transaction => {
      const transDate = typeof transaction.date === 'string' ? parseISO(transaction.date) : new Date(transaction.date);
      let index = 0;
      
      if (isPeriodWeek) {
        // For week period, index based on day
        const dayDiff = Math.floor((endDate - transDate) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 7) {
          index = 6 - dayDiff;
          dataPoints[index] += transaction.amount;
        }
      } else if (isPeriodYear || isPeriodAll) {
        // For year or all, index based on month
        const currentMonth = endDate.getMonth();
        const transMonth = transDate.getMonth();
        let monthDiff = (currentMonth - transMonth + 12) % 12;
        if (monthDiff < 12) {
          index = 11 - monthDiff;
          dataPoints[index] += transaction.amount;
        }
      } else {
        // For month period, index based on week
        const dayDiff = Math.floor((endDate - transDate) / (1000 * 60 * 60 * 24));
        if (dayDiff < 28) {
          index = Math.min(3, Math.floor(dayDiff / 7));
          dataPoints[3 - index] += transaction.amount;
        }
      }
    });
    
    setTrendData({
      labels: dateLabels,
      datasets: [{ data: dataPoints }]
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount, currency = 'INR') => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const pieChartData = useMemo(() => {
    return categoryStats.slice(0, 5).map((item) => ({
      name: item.categoryData.name,
      amount: item.total,
      color: item.categoryData.color,
      legendFontColor: theme.colors.text.primary,
      legendFontSize: 12
    }));
  }, [categoryStats]);

  const renderPeriodFilters = () => {
    const filters = [
      { id: 'week', label: 'Week' },
      { id: 'month', label: 'Month' },
      { id: 'year', label: 'Year' },
      { id: 'all', label: 'All' },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodFilterContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.periodFilterItem,
              periodFilter === filter.id && styles.activePeriodFilter,
            ]}
            onPress={() => setPeriodFilter(filter.id)}
          >
            <Text
              style={[
                styles.periodFilterText,
                periodFilter === filter.id && styles.activePeriodFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <AnimatedScreenWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={activeTab === 'expense' ? theme.colors.financial.expense : theme.colors.financial.income}
          translucent={Platform.OS === 'android'}
        />
      
        <LinearGradient
          colors={
            activeTab === 'expense' 
              ? ['#FF6B78', '#FF8086'] 
              : ['#4CD964', '#5AE273']
          }
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Statistics</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
              onPress={() => setActiveTab('expense')}
            >
              <Ionicons 
                name="trending-up" 
                size={18} 
                color={activeTab === 'expense' ? theme.colors.financial.expense : 'rgba(255,255,255,0.7)'} 
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'expense' && styles.activeTabText,
                ]}
              >
                Expenses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'income' && styles.activeTab]}
              onPress={() => setActiveTab('income')}
            >
              <Ionicons 
                name="trending-down" 
                size={18} 
                color={activeTab === 'income' ? theme.colors.financial.income : 'rgba(255,255,255,0.7)'} 
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'income' && styles.activeTabText,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.summaryTitle}>
            Total {activeTab === 'expense' ? 'Expenses' : 'Income'}
          </Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(
              activeTab === 'expense' ? stats.expense : stats.income
            )}
          </Text>
        </LinearGradient>

        {renderPeriodFilters()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Trend Analysis Chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'expense' ? 'Expense' : 'Income'} Trends
              </Text>
              
              {trendData.datasets[0].data.some(val => val > 0) ? (
                <LineChart
                  data={trendData}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.colors.background.card,
                    backgroundGradientFrom: theme.colors.background.card,
                    backgroundGradientTo: theme.colors.background.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => activeTab === 'expense' 
                      ? `rgba(255, 107, 120, ${opacity})` 
                      : `rgba(76, 217, 100, ${opacity})`,
                    labelColor: (opacity = 1) => theme.colors.text.secondary,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: activeTab === 'expense' ? '#FF6B78' : '#4CD964'
                    },
                    formatYLabel: val => formatCompactCurrency(val),
                  }}
                  bezier
                  style={styles.chart}
                />
              ) : (
                <View style={styles.emptyChartContainer}>
                  <Ionicons name="analytics-outline" size={50} color={theme.colors.text.secondary} />
                  <Text style={styles.emptyText}>No data for selected period</Text>
                </View>
              )}
            </View>

            {/* Category Breakdown */}
            <Text style={styles.sectionTitle}>Category Breakdown</Text>

            {categoryStats.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="pie-chart-outline" size={50} color={theme.colors.text.secondary} />
                <Text style={styles.emptyText}>
                  No {activeTab} data for the selected period
                </Text>
              </View>
            ) : (
              <View style={styles.categoryBreakdownContainer}>
                {/* Pie Chart */}
                <View style={styles.pieChartContainer}>
                  {pieChartData.length > 0 ? (
                    <PieChart
                      data={pieChartData}
                      width={chartWidth}
                      height={220}
                      chartConfig={{
                        backgroundColor: theme.colors.background.card,
                        backgroundGradientFrom: theme.colors.background.card,
                        backgroundGradientTo: theme.colors.background.card,
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      }}
                      accessor="amount"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute
                    />
                  ) : (
                    <View style={styles.emptyChartContainer}>
                      <Ionicons name="pie-chart-outline" size={50} color={theme.colors.text.secondary} />
                      <Text style={styles.emptyText}>No data for selected period</Text>
                    </View>
                  )}
                </View>
                
                {/* Category List */}
                <View style={styles.categoryList}>
                  {categoryStats.map((item) => (
                    <View key={item.id} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryNameContainer}>
                          <View
                            style={[
                              styles.categoryIcon,
                              { backgroundColor: item.categoryData.color },
                            ]}
                          >
                            <Ionicons
                              name={item.categoryData.icon}
                              size={16}
                              color="white"
                            />
                          </View>
                          <Text style={styles.categoryName}>
                            {item.categoryData.name}
                          </Text>
                        </View>
                        <Text style={styles.categoryAmount}>
                          {formatCurrency(item.total, 'INR')}
                        </Text>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.max(item.percentage, 5)}%`,
                              backgroundColor: item.categoryData.color,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.categoryFooter}>
                        <Text style={styles.percentageText}>
                          {item.percentage.toFixed(1)}%
                        </Text>
                        <Text style={styles.countText}>
                          {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </AnimatedScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  spacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: theme.colors.background.card,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
  },
  activeTabText: {
    color: theme.colors.text.primary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.light,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  periodFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 80,
  },
  periodFilterItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    height: 40,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(160, 149, 255, 0.3)',
  },
  activePeriodFilter: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(224, 224, 224, 0.9)',
  },
  activePeriodFilterText: {
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginVertical: 12,
  },
  categoryBreakdownContainer: {
    marginBottom: 16,
  },
  pieChartContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryList: {
    marginTop: 8,
  },
  categoryItem: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.background.light,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  countText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyChartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default StatisticsScreen; 