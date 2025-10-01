interface EmailFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function EmailField({ name, label, value, placeholder, required, onChange }: EmailFieldProps) {
  return (
    <input
      type="email"
      id={name}
      name={name}
      value={value}
      placeholder={placeholder || "example@email.com"}
      required={required}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      className="input-flat"
    />
  );
}