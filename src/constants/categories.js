import theme from '../constants/theme';

const categories = [
  {
    id: 'food',
    name: 'Food & Drinks',
    icon: 'fast-food-outline',
    color: theme.colors.categoryColors.food,
    type: 'expense',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'cart-outline',
    color: theme.colors.categoryColors.shopping,
    type: 'expense',
  },
  {
    id: 'transportation',
    name: 'Transportation',
    icon: 'car-outline',
    color: theme.colors.categoryColors.transportation,
    type: 'expense',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: theme.colors.categoryColors.entertainment,
    type: 'expense',
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'medkit-outline',
    color: theme.colors.categoryColors.health,
    type: 'expense',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: 'document-text-outline',
    color: theme.colors.categoryColors.bills,
    type: 'expense',
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'school-outline',
    color: theme.colors.categoryColors.education,
    type: 'expense',
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'airplane-outline',
    color: theme.colors.categoryColors.travel,
    type: 'expense',
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'home-outline',
    color: theme.colors.categoryColors.home,
    type: 'expense',
  },
  {
    id: 'salary',
    name: 'Salary',
    icon: 'cash-outline',
    color: theme.colors.categoryColors.salary,
    type: 'income',
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: 'trending-up-outline',
    color: theme.colors.categoryColors.investments,
    type: 'income',
  },
  {
    id: 'gifts',
    name: 'Gifts',
    icon: 'gift-outline',
    color: theme.colors.categoryColors.gifts,
    type: 'income',
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: theme.colors.categoryColors.other,
    type: 'both',
  },
];

export const getCategories = (type) => {
  if (!type) return categories;
  if (type === 'all') return categories;
  return categories.filter(category => category.type === type || category.type === 'both');
};

export const EXPENSE_CATEGORIES = categories.filter(category => 
  category.type === 'expense' || category.type === 'both'
);

export const INCOME_CATEGORIES = categories.filter(category => 
  category.type === 'income' || category.type === 'both'
);

export const getCategoryById = (id) => {
  return categories.find(category => category.id === id) || categories[categories.length - 1];
};

export default categories; 