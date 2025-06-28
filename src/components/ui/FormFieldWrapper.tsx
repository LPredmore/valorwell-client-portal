
import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface Option {
  value: string;
  label: string;
}

interface FormFieldWrapperProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select';
  options?: string[] | Option[];
  readOnly?: boolean;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
  valueMapper?: (label: any) => string;
  labelMapper?: (value: any) => any;
  onValueCommit?: (name: any, value: any) => Promise<void> | void;
}

const FormFieldWrapper = <T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  options = [],
  readOnly = false,
  placeholder,
  required = false,
  maxLength,
  defaultValue,
  valueMapper,
  labelMapper,
  onValueCommit
}: FormFieldWrapperProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{required && ' *'}</FormLabel>
          <FormControl>
            {type === 'select' ? (
              <Select
                value={field.value || defaultValue || ''}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (onValueCommit) {
                    onValueCommit(name, value);
                  }
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => {
                    // Handle both string options and {value, label} objects
                    const optionValue = typeof option === 'string' ? option : option.value;
                    const optionLabel = typeof option === 'string' ? option : option.label || option.value;
                    
                    return (
                      <SelectItem key={optionValue} value={optionValue}>
                        {optionLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                {...field}
                type={type}
                readOnly={readOnly}
                placeholder={placeholder}
                className={readOnly ? 'bg-gray-50' : ''}
                {...(maxLength && { maxLength })}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormFieldWrapper;
