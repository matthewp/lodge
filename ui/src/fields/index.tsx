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

interface BaseFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

interface FieldComponentProps extends BaseFieldProps {
  type: string;
}

export function FieldComponent({ type, ...props }: FieldComponentProps) {
  switch (type) {
    case 'text':
      return <TextField {...props} />;
    case 'textarea':
      return <TextareaField {...props} />;
    case 'markdown':
      return <MarkdownField {...props} />;
    case 'email':
      return <EmailField {...props} />;
    case 'url':
      return <UrlField {...props} />;
    case 'number':
      return <NumberField {...props} />;
    case 'date':
      return <DateField {...props} />;
    case 'boolean':
      return <BooleanField {...props} />;
    default:
      return <TextField {...props} />;
  }
}