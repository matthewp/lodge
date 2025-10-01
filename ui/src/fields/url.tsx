interface UrlFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function UrlField({ name, label, value, placeholder, required, onChange }: UrlFieldProps) {
  return (
    <input
      type="url"
      id={name}
      name={name}
      value={value}
      placeholder={placeholder || "https://example.com"}
      required={required}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      className="input-flat"
    />
  );
}