interface BooleanFieldProps {
  name: string;
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function BooleanField({ name, label, value, required, onChange }: BooleanFieldProps) {
  const isChecked = value === 'true';

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={isChecked}
        required={required}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked ? 'true' : 'false')}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}