import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import theme from '../theme';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  getCategoryById 
} from '../constants/categories';

const { height, width } = Dimensions.get('window');

const CategorySelector = ({ selectedCategory, onSelect, type = 'expense', error }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [opacityAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);
  
  // Handle back button on Android for modal
  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        toggleModal();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [modalVisible]);
  
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };
  
  const handleCategorySelect = (categoryId) => {
    onSelect(categoryId);
    toggleModal();
  };
  
  const renderCategory = ({ item, index }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 30}
      duration={300}
    >
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.id && styles.selectedCategoryItem
        ]}
        onPress={() => handleCategorySelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '25' }]}>
          <Ionicons name={item.icon} size={24} color={item.color} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
        {selectedCategory === item.id && (
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </Animatable.View>
  );
  
  // Get selected category data
  const selectedCategoryData = selectedCategory 
    ? getCategoryById(selectedCategory) 
    : null;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedCategory ? styles.selectedButton : null,
          error ? styles.errorButton : null,
        ]}
        onPress={toggleModal}
        activeOpacity={0.8}
      >
        {selectedCategoryData ? (
          <View style={styles.selectedCategory}>
            <View style={[styles.categoryIcon, { backgroundColor: selectedCategoryData.color + '15' }]}>
              <Ionicons name={selectedCategoryData.icon} size={20} color={selectedCategoryData.color} />
            </View>
            <Text style={styles.categoryText}>{selectedCategoryData.name}</Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="grid-outline" size={20} color={theme.colors.text.muted} />
            <Text style={styles.placeholderText}>Select a category</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>
      
      {error && (
        <Animatable.Text 
          animation="fadeIn" 
          style={styles.errorText}
        >
          {error}
        </Animatable.Text>
      )}
      
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={toggleModal}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={toggleModal}>
            <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]} />
          </TouchableWithoutFeedback>
          
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                onPress={toggleModal} 
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoriesList}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.light,
  },
  selectedButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background.card,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(108, 99, 255, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  errorButton: {
    borderColor: theme.colors.status.error,
    backgroundColor: `${theme.colors.status.error}05`,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.muted,
    marginLeft: 8,
  },
  errorText: {
    color: theme.colors.status.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: 4,
    paddingLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: height * 0.7,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesList: {
    paddingBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.card,
  },
  categoryName: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
  selectedCategoryItem: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background.card,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(108, 99, 255, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

export default CategorySelector; 