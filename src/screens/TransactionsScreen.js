import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../context/TransactionContext';
import TransactionItem from '../components/TransactionItem';
import theme from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreenWrapper from '../components/AnimatedScreenWrapper';

const { width } = Dimensions.get('window');

const TransactionsScreen = ({ navigation }) => {
  const { getFilteredTransactions } = useTransactions();
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  const loadTransactions = useCallback(() => {
    const allTransactions = getFilteredTransactions({});
    setTransactions(allTransactions);
    applyFilters(allTransactions, activeFilter, searchText);
  }, [getFilteredTransactions, activeFilter, searchText]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const applyFilters = (txList, filter, search) => {
    let filtered = [...txList];
    
    // Apply type filter
    if (filter === 'income') {
      filtered = filtered.filter(tx => tx.type === 'income');
    } else if (filter === 'expense') {
      filtered = filtered.filter(tx => tx.type === 'expense');
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        tx =>
          tx.note?.toLowerCase().includes(searchLower) ||
          tx.description?.toLowerCase().includes(searchLower) ||
          tx.category.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    applyFilters(transactions, activeFilter, searchText);
  }, [activeFilter, searchText, transactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchText(text);
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
  };

  const handleTransactionPress = (transaction) => {
    navigation.navigate('TransactionDetail', { id: transaction.id, transaction });
  };

  const renderFilterTabs = () => {
    const filters = [
      { id: 'all', label: 'All', icon: 'list-outline' },
      { id: 'income', label: 'Income', icon: 'arrow-down-outline' },
      { id: 'expense', label: 'Expenses', icon: 'arrow-up-outline' },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              activeFilter === filter.id && styles.activeFilterTab,
            ]}
            onPress={() => handleFilterPress(filter.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={filter.icon} 
              size={16} 
              color={activeFilter === filter.id ? 'white' : theme.colors.text.secondary} 
              style={styles.filterIcon}
            />
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.id && styles.activeFilterTabText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="search-outline" size={50} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchText
          ? 'Try adjusting your search or filters'
          : 'Start adding transactions to see them here'}
      </Text>
    </View>
  );

  return (
    <AnimatedScreenWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.primary}
          translucent={Platform.OS === 'android'}
        />
        
        <LinearGradient
          colors={[theme.colors.primary, '#5A52CC']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Transactions</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.text.secondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transactions..."
                value={searchText}
                onChangeText={handleSearch}
                placeholderTextColor={theme.colors.text.secondary}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {Platform.OS === 'android' && searchText ? (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </LinearGradient>
        
        <View style={styles.contentContainer}>
          {renderFilterTabs()}

          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionItem
                transaction={item}
                onPress={handleTransactionPress}
              />
            )}
            ListEmptyComponent={renderEmptyList}
            contentContainerStyle={
              filteredTransactions.length === 0 
                ? styles.emptyListContainer 
                : styles.listContainer
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={true}
            onEndReachedThreshold={0.1}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={21}
            removeClippedSubviews={Platform.OS === 'android'}
            nestedScrollEnabled={true}
            contentInset={{bottom: 90}}
            contentOffset={{x: 0, y: 0}}
          />
        </View>
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
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  spacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: 'white',
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 6,
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: theme.colors.background.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    minWidth: width / 3.5,
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterIcon: {
    marginRight: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  activeFilterTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
    minHeight: 400,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(100, 100, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default TransactionsScreen; 