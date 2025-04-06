const colors = {
  primary: "#4A6572",
  primaryLight: "#7994A1",
  primaryDark: "#203A46",
  secondary: "#FF9800",
  secondaryLight: "#FFCC80",
  secondaryDark: "#F57C00",
  accent: "#03DAC6",
  error: "#B00020",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  onPrimary: "#FFFFFF",
  onSecondary: "#000000",
  textPrimary: "#212121",
  textSecondary: "#757575",
  divider: "#BDBDBD",
  expense: "#FF5252",
  income: "#4CAF50",
  card: {
    background: "rgba(255, 255, 255, 0.9)",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  categoryColors: {
    food: "#FF9800",
    shopping: "#F06292",
    transportation: "#64B5F6",
    entertainment: "#9575CD",
    health: "#4DD0E1",
    bills: "#FF7043",
    education: "#4DB6AC",
    travel: "#FFD54F",
    home: "#81C784",
    salary: "#66BB6A",
    investments: "#7986CB",
    gifts: "#BA68C8",
    other: "#78909C",
  },
};

const typography = {
  fontFamily: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
  fontSize: {
    tiny: 10,
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    xxxlarge: 30,
  },
  lineHeight: {
    tiny: 14,
    small: 18,
    regular: 20,
    medium: 24,
    large: 26,
    xlarge: 28,
    xxlarge: 32,
    xxxlarge: 38,
  },
};

const spacing = {
  tiny: 4,
  small: 8,
  regular: 12,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
  xxxlarge: 64,
};

const borderRadius = {
  small: 4,
  regular: 8,
  medium: 12,
  large: 16,
  xlarge: 24,
  circle: 9999,
};

const shadows = {
  small: {
    shadowColor: colors.card.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.card.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: colors.card.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
}; 