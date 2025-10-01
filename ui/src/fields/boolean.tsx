interface BooleanFieldProps {
  name: string;
  label: string;
  value: boolean | string;
  required?: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanField({ name, label, value, required, onChange }: BooleanFieldProps) {
  // Handle both boolean and string values for backward compatibility
  const isChecked = typeof value === 'boolean' ? value : value === 'true';

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={isChecked}
        required={required}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
        className="h-6 w-6 border-4 border-gray-400 text-black focus:ring-0"
      />
      <label htmlFor={name} className="ml-3 text-sm font-bold text-gray-900 uppercase">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
    </div>
  );
}