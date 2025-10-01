interface DateFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function DateField({ name, label, value, placeholder, required, onChange }: DateFieldProps) {
  return (
    <input
      type="date"
      id={name}
      name={name}
      value={value}
      placeholder={placeholder}
      required={required}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      className="input-flat"
    />
  );
}