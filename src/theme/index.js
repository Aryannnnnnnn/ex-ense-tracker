/**
 * Theme configuration for the Expense Tracker app
 * This file contains color schemes, typography, spacing, and other design elements
 */

// Color Palette
export const colors = {
  // Primary colors
  primary: '#A095FF',  // Lighter purple for better contrast on dark
  primaryDark: '#7B70FF', // Original primary becomes dark
  secondary: '#FF6584', // Vibrant pink for accents
  
  // Background colors
  background: {
    light: '#121212',  // Dark gray for lighter backgrounds
    white: '#1E1E1E',  // Dark surface color instead of white
    card: '#2D2D2D',   // Darker gray for cards
    modal: '#1E1E1E',  // Dark for modals
    gradient: {
      primary: ['#A095FF', '#7B70FF'],
      success: ['#33C6AA', '#28B99D'],
      warning: ['#FFBC42', '#FFB125'],
      error: ['#FF5B79', '#FF4B69'],
    }
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',    // White for primary text
    secondary: '#E0E0E0',  // Light gray for secondary text
    muted: '#9E9E9E',      // Medium gray for muted text
    light: '#757575',      // Darker gray for light text
    white: '#FFFFFF',      // White text remains white
  },
  
  // Status colors
  status: {
    success: '#4ECCA3',  // Brighter success green
    warning: '#FFD369',  // Brighter warning yellow
    error: '#FF6B8B',    // Brighter error red
    info: '#6BBFFF',     // Brighter info blue
  },
  
  // Financial colors
  financial: {
    income: '#4ECCA3',   // Brighter income green
    expense: '#FF6B8B',  // Brighter expense red
    savings: '#A095FF',  // Brighter savings purple
    investment: '#FFD369', // Brighter investment yellow
  },
  
  // Category colors
  categories: {
    food: '#FF7A7A',        // Brighter food
    transport: '#5FDED1',   // Brighter transport
    shopping: '#FFB74C',    // Brighter shopping
    entertainment: '#9D90DB', // Brighter entertainment
    housing: '#3DBEAF',     // Brighter housing
    utilities: '#F4B57A',   // Brighter utilities
    healthcare: '#F4836A',  // Brighter healthcare
    education: '#4CB9D7',   // Brighter education
    personal: '#A0D4EF',    // Brighter personal
    other: '#BBBBBB',       // Brighter other
  },
  
  // UI Element colors
  border: '#3D3D3D',      // Darker border for dark theme
  divider: '#3D3D3D',     // Darker divider for dark theme
  shadow: 'rgba(0, 0, 0, 0.5)', // Darker shadow for dark theme
};

// Typography
export const typography = {
  fontFamily: {
    base: 'System',
    heading: 'System',
  },
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2.0,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4.84,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6.46,
    elevation: 8,
  },
};

// Border Radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Component-specific styles
export const components = {
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.text.white,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 1,
      color: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    danger: {
      backgroundColor: colors.status.error,
      color: colors.text.white,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  },
  card: {
    container: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.md,
    },
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
  },
  input: {
    container: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    field: {
      backgroundColor: '#3A3A3A',  // Darker background for better contrast with white text
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.fontSize.md,
      color: colors.text.primary,
    },
  },
};

export default {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  components,
}; 