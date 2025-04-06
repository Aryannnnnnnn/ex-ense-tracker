import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for form handling with validation
 * @param {Object} config - Form configuration
 * @param {Object} config.initialValues - Initial form values
 * @param {Object} config.validationSchema - Validation schema with field validators
 * @param {Function} config.onSubmit - Submit handler function
 * @returns {Object} Form handlers and state
 */
const useForm = (config = {}) => {
  const { 
    initialValues = {}, 
    validationSchema = {}, 
    onSubmit = async () => {} 
  } = config;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback((field, value, allValues) => {
    if (!validationSchema[field]) return '';
    return validationSchema[field](value, allValues);
  }, [validationSchema]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field, values[field], values);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    return { isValid, errors: newErrors };
  }, [validationSchema, validateField, values]);

  // Handle field change
  const handleChange = useCallback((field) => (value) => {
    setValues(prevValues => ({
      ...prevValues,
      [field]: value
    }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [field]: undefined
      }));
    }
  }, [errors]);

  // Handle field blur
  const handleBlur = useCallback((field) => () => {
    setTouched(prevTouched => ({
      ...prevTouched,
      [field]: true
    }));
    
    // Validate the field on blur
    const error = validateField(field, values[field], values);
    if (error) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [field]: error
      }));
    }
  }, [values, validateField]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Form valid status
  const isValid = useMemo(() => {
    return Object.keys(validationSchema).every(field => !validateField(field, values[field], values));
  }, [validationSchema, validateField, values]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validation = validateForm();
    
    setErrors(validation.errors);
    
    // Mark all fields as touched on submit
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    if (validation.isValid) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validateForm, onSubmit]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    isValid
  };
};

export default useForm; 