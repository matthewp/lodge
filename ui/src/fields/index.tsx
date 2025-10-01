export { TextField } from './text';
export { TextareaField } from './textarea';
export { MarkdownField } from './markdown';
export { EmailField } from './email';
export { UrlField } from './url';
export { NumberField } from './number';
export { DateField } from './date';
export { BooleanField } from './boolean';

import { TextField } from './text';
import { TextareaField } from './textarea';
import { MarkdownField } from './markdown';
import { EmailField } from './email';
import { UrlField } from './url';
import { NumberField } from './number';
import { DateField } from './date';
import { BooleanField } from './boolean';

interface Field {
  id: number;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  defaultValue: string;
  sortOrder: number;
}

interface FieldComponentProps {
  field: Field;
  value: any;
  onChange: (value: any) => void;
}

export function FieldComponent({ field, value, onChange }: FieldComponentProps) {
  const baseProps = {
    name: field.name,
    label: field.label,
    placeholder: field.placeholder,
    required: field.required,
  };

  switch (field.type) {
    case 'text':
      return <TextField {...baseProps} value={value || ''} onChange={onChange} />;
    case 'textarea':
      return <TextareaField {...baseProps} value={value || ''} onChange={onChange} />;
    case 'markdown':
      // Handle both string and MarkdownValue types
      const markdownValue = typeof value === 'object' && value?.md !== undefined
        ? value
        : { md: value || '', html: '' };
      return <MarkdownField {...baseProps} value={markdownValue} onChange={onChange} />;
    case 'email':
      return <EmailField {...baseProps} value={value || ''} onChange={onChange} />;
    case 'url':
      return <UrlField {...baseProps} value={value || ''} onChange={onChange} />;
    case 'number':
      return <NumberField {...baseProps} value={value} onChange={onChange} />;
    case 'date':
      return <DateField {...baseProps} value={value || ''} onChange={onChange} />;
    case 'boolean':
      return <BooleanField {...baseProps} value={value} onChange={onChange} />;
    default:
      return <TextField {...baseProps} value={value || ''} onChange={onChange} />;
  }
}
