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
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        rows={4}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
  );
}