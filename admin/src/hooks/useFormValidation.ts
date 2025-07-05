import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (errors: Record<string, string>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showToastOnError?: boolean;
  resetOnSubmit?: boolean;
}

export interface FormValidationReturn<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, message: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  setFieldTouched: (field: keyof T) => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (values?: Partial<T>) => void;
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    error: string | undefined;
    touched: boolean;
  };
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: Partial<T>,
  options: FormValidationOptions<T>
): FormValidationReturn<T> {
  const {
    schema,
    onSubmit,
    onError,
    validateOnChange = true,
    validateOnBlur = true,
    showToastOnError = true,
    resetOnSubmit = false,
  } = options;

  const [values, setValuesState] = useState<Partial<T>>(initialValues);
  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValuesState] = useState(initialValues);

  // Check if form is dirty (has changes)
  const isDirty = Object.keys(values).some(
    key => values[key] !== initialValuesState[key]
  );

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  // Set single value
  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange) {
      // Clear existing error for this field
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
      
      // Validate the field
      try {
        const fieldSchema = schema.shape?.[field as string];
        if (fieldSchema) {
          fieldSchema.parse(value);
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0];
          if (fieldError) {
            setErrorsState(prev => ({
              ...prev,
              [field as string]: fieldError.message,
            }));
          }
        }
      }
    }
  }, [schema, validateOnChange]);

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set single error
  const setError = useCallback((field: keyof T, message: string) => {
    setErrorsState(prev => ({ ...prev, [field as string]: message }));
  }, []);

  // Set multiple errors
  const setErrors = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors);
  }, []);

  // Clear single error
  const clearError = useCallback((field: keyof T) => {
    setErrorsState(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  // Set touched state
  const setTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field as string]: isTouched }));
  }, []);

  // Set field as touched
  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(field, true);
  }, [setTouched]);

  // Validate single field
  const validateField = useCallback((field: keyof T): boolean => {
    try {
      const fieldSchema = schema.shape?.[field as string];
      if (fieldSchema) {
        fieldSchema.parse(values[field]);
        clearError(field);
        return true;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors[0];
        if (fieldError) {
          setError(field, fieldError.message);
          return false;
        }
      }
      return false;
    }
  }, [schema, values, setError, clearError]);

  // Validate entire form
  const validateForm = useCallback(): boolean => {
    try {
      schema.parse(values);
      clearErrors();
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
        
        if (onError) {
          onError(newErrors);
        }
        
        if (showToastOnError) {
          toast.error('Please fix the form errors before submitting');
        }
        
        return false;
      }
      return false;
    }
  }, [schema, values, clearErrors, setErrors, onError, showToastOnError]);

  // Handle field change
  const handleChange = useCallback((field: keyof T) => (value: any) => {
    setValue(field, value);
  }, [setValue]);

  // Handle field blur
  const handleBlur = useCallback((field: keyof T) => () => {
    setFieldTouched(field);
    
    if (validateOnBlur) {
      validateField(field);
    }
  }, [setFieldTouched, validateOnBlur, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Mark all fields as touched
      const allFields = Object.keys(values);
      const touchedState: Record<string, boolean> = {};
      allFields.forEach(field => {
        touchedState[field] = true;
      });
      setTouchedState(touchedState);

      // Validate form
      if (!validateForm()) {
        return;
      }

      // Submit form
      await onSubmit(values as T);

      if (resetOnSubmit) {
        reset();
      }

      toast.success('Form submitted successfully');
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An error occurred while submitting the form');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, isSubmitting, validateForm, onSubmit, resetOnSubmit]);

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues || initialValues;
    setValuesState(resetValues);
    setErrorsState({});
    setTouchedState({});
  }, [initialValues]);

  // Get field props for easy integration
  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    error: errors[field as string],
    touched: touched[field as string] || false,
  }), [values, errors, touched, handleChange, handleBlur]);

  // Auto-validate on values change if enabled
  useEffect(() => {
    if (validateOnChange && Object.keys(touched).length > 0) {
      // Only validate touched fields to avoid showing errors immediately
      Object.keys(touched).forEach(field => {
        if (touched[field]) {
          validateField(field as keyof T);
        }
      });
    }
  }, [values, touched, validateOnChange, validateField]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    setValue,
    setValues,
    setError,
    setErrors,
    clearError,
    clearErrors,
    setTouched,
    setFieldTouched,
    validateField,
    validateForm,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
  };
}

// Hook for async validation
export function useAsyncValidation<T>(
  validator: (value: T) => Promise<boolean>,
  debounceMs = 500
) {
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    async (value: T) => {
      setIsValidating(true);
      setError(null);

      try {
        const result = await validator(value);
        setIsValid(result);
        
        if (!result) {
          setError('Validation failed');
        }
      } catch (err) {
        setIsValid(false);
        setError(err instanceof Error ? err.message : 'Validation error');
      } finally {
        setIsValidating(false);
      }
    },
    [validator]
  );

  // Debounced validation
  const debouncedValidate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (value: T) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => validate(value), debounceMs);
      };
    })(),
    [validate, debounceMs]
  );

  return {
    isValidating,
    isValid,
    error,
    validate,
    debouncedValidate,
  };
}

// Hook for form field arrays
export function useFieldArray<T>(
  initialItems: T[] = [],
  itemSchema?: z.ZodSchema<T>
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  }, []);

  const updateItem = useCallback((index: number, item: T) => {
    setItems(prev => prev.map((prevItem, i) => i === index ? item : prevItem));
    
    // Validate item if schema provided
    if (itemSchema) {
      try {
        itemSchema.parse(item);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0];
          if (fieldError) {
            setErrors(prev => ({
              ...prev,
              [index]: fieldError.message,
            }));
          }
        }
      }
    }
  }, [itemSchema]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const validateItems = useCallback((): boolean => {
    if (!itemSchema) return true;

    const newErrors: Record<number, string> = {};
    let isValid = true;

    items.forEach((item, index) => {
      try {
        itemSchema.parse(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0];
          if (fieldError) {
            newErrors[index] = fieldError.message;
            isValid = false;
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [items, itemSchema]);

  return {
    items,
    errors,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    validateItems,
    setItems,
  };
}
