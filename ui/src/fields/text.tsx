interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function TextField({ name, label, value, placeholder, required, onChange }: TextFieldProps) {
  return (
    <input
      type="text"
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