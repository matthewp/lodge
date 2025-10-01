interface NumberFieldProps {
  name: string;
  label: string;
  value: number | string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: number | null) => void;
}

export function NumberField({ name, label, value, placeholder, required, onChange }: NumberFieldProps) {
  const handleChange = (e: Event) => {
    const inputValue = (e.target as HTMLInputElement).value;
    if (inputValue === '') {
      onChange(null);
    } else {
      const numValue = parseFloat(inputValue);
      onChange(isNaN(numValue) ? null : numValue);
    }
  };

  return (
    <input
      type="number"
      id={name}
      name={name}
      value={value ?? ''}
      placeholder={placeholder}
      required={required}
      onChange={handleChange}
      className="input-flat"
    />
  );
}