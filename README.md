# Expense Tracker App

A comprehensive mobile application for tracking personal finances, managing expenses, and setting financial goals.

## Overview

Expense Tracker is a feature-rich financial management application that helps users track their spending, monitor their budget, and achieve their financial goals. The app provides a user-friendly interface for recording income and expenses, visualizing spending patterns through various charts, and exporting financial data for record-keeping.

## Features

### Core Functionality
- **Transaction Management**: Record income and expenses with detailed categorization
- **Cloud Synchronization**: Secure data storage with Firebase Firestore
- **User Authentication**: Secure login and registration with Firebase Auth
- **Multi-Currency Support**: Track expenses in your preferred currency

### Advanced Features
- **Budget Management**: Set monthly budgets with per-category limits
- **Financial Goals**: Create and track savings goals with progress visualization
- **Recurring Transactions**: Schedule repeating transactions (monthly bills, subscriptions)
- **Smart Categorization**: Automatic categorization of transactions based on description
- **Comprehensive Analytics**: Detailed charts and statistics to understand spending patterns
- **Data Export**: Export transactions to CSV, JSON, and PDF formats
- **Customizable Categories**: Personalize expense categories to match your needs
- **Cloudinary Integration**: Upload and manage profile images with Cloudinary

## Screenshots

[Screenshots will be added here]

## Prerequisites

- Node.js (v14+)
- Expo CLI
- Firebase account (for Firestore and Authentication)
- Cloudinary account (for image storage)

## Installation and Setup

1. Clone the repository
```
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
```

2. Install dependencies
```
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

4. Start the development server
```
expo start
```

## Demo Account

For testing purposes, you can use the following demo account:
- Email: demo@example.com
- Password: password123

## Project Structure

```
expense-tracker/
├── src/
│   ├── assets/          # Images, fonts, and other static files
│   ├── components/      # Reusable UI components
│   ├── constants/       # App constants and configuration
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   └── utils/           # Utility functions
├── App.js               # Main application component
├── app.json             # Expo configuration
└── package.json         # Project dependencies
```

## Technology Stack

- **Frontend Framework**: React Native with Expo
- **State Management**: React Context API
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Cloudinary
- **UI Components**: Custom components with React Native elements
- **Charts**: React Native Chart Kit
- **Forms**: Custom form handling with validation

## Utilities and Helpers

The app includes several utility modules that enhance functionality:

- **Chart Utilities**: Generates data for various chart visualizations
- **Formatters**: Functions for formatting currency, dates, and percentages
- **Validators**: Input validation for forms and data
- **Auto-categorization**: Smart categorization of transactions based on description
- **Recurring Transactions**: Handles recurring transaction logic
- **Export Utilities**: Export data to various formats (CSV, JSON, PDF)

## Feature Details

### Budget Management
The app allows users to set both overall monthly budgets and category-specific budgets. Progress bars visually indicate how much of the budget has been used, with color-coding for approaching or exceeding limits.

### Financial Goals
Users can set up savings goals with target amounts and deadlines. The app tracks progress toward these goals and allows users to allocate funds directly to specific goals.

### Enhanced Statistics
The statistics screen provides multiple visualizations:
- Expense distribution by category (pie chart)
- Income vs expenses over time (bar chart)
- Spending trends over time (line chart)
- Daily spending patterns (line chart)
- Top spending categories (horizontal bar chart)

### Recurring Transactions
The app supports various recurrence patterns:
- Daily
- Weekly
- Biweekly
- Monthly
- Quarterly
- Yearly

Transactions can be set to recur indefinitely or for a specific number of occurrences/until a specific date.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Icons by Ionicons
- Charts powered by React Native Chart Kit
- Authentication and database by Firebase
- Image storage by Cloudinary

## Deployment

### Publishing to Expo

1. Make sure you have an Expo account
2. Configure your app.json with the correct details
3. Run `expo publish` to publish to Expo's servers
4. Share your app with others via the Expo Go app or a direct link

### Building Standalone Apps

#### Android

1. Make sure you have set up your app.json correctly
2. Run `expo build:android -t apk` for an APK or `expo build:android -t app-bundle` for an AAB file
3. Follow the prompts to create a keystore or use an existing one
4. Download your build when complete

#### iOS

1. Make sure you have an Apple Developer account
2. Run `expo build:ios`
3. Follow the prompts to set up your credentials
4. Download your build when complete

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Firebase](https://firebase.google.com/)
- [Cloudinary](https://cloudinary.com/)
- [React Navigation](https://reactnavigation.org/)
- [Ionicons](https://ionic.io/ionicons) 