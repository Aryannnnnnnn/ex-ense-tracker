import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Custom hook for handling date picker functionality
 * @param {Date|string} initialDate - Initial date value
 * @param {Function} onChange - Callback when date changes
 * @returns {Object} Date picker state and handlers
 */
const useDatePicker = (initialDate = new Date(), onChange = () => {}) => {
  const [date, setDate] = useState(initialDate instanceof Date ? initialDate : new Date(initialDate));
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState('date');

  /**
   * Handler for date change
   * @param {Event} event - Event object
   * @param {Date} selectedDate - Selected date
   */
  const onDateChange = useCallback((event, selectedDate) => {
    const currentDate = selectedDate || date;
    
    // On Android, the picker is closed automatically after selection
    // On iOS, we need to handle this manually
    if (Platform.OS === 'ios') {
      setShow(mode === 'time');
      if (mode === 'date') {
        setMode('time');
      }
    } else {
      setShow(false);
    }
    
    setDate(currentDate);
    onChange(currentDate);
  }, [date, mode, onChange]);

  /**
   * Show the date picker
   * @param {string} currentMode - Picker mode ('date' or 'time')
   */
  const showDatepicker = useCallback((currentMode = 'date') => {
    setShow(true);
    setMode(currentMode);
  }, []);

  /**
   * Dismiss the date picker
   */
  const hideDatepicker = useCallback(() => {
    setShow(false);
  }, []);

  return {
    date,
    show,
    mode,
    setDate,
    onDateChange,
    showDatepicker,
    hideDatepicker,
  };
};

export default useDatePicker; 