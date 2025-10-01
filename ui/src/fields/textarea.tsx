interface TextareaFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function TextareaField({ name, label, value, placeholder, required, onChange }: TextareaFieldProps) {
  return (
    <textarea
      id={name}
      name={name}
      value={value}
      placeholder={placeholder}
      required={required}
      rows={5}
      onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
      className="input-flat"
    />
  );
}