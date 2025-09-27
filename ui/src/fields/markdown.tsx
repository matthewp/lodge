import { useEffect, useRef } from 'preact/hooks';

interface MarkdownFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export function MarkdownField({ name, label, value, placeholder, required, onChange }: MarkdownFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initEditor = async () => {
      if (!editorRef.current || editorInstanceRef.current) return;

      try {
        // Dynamic import of ink-mde
        const { ink, defineOptions } = await import('ink-mde');

        if (!mounted) return;

        const options = defineOptions({
          doc: value || '',
          placeholder: placeholder || "Write your markdown here...",
          hooks: {
            afterUpdate: (doc: string) => {
              if (mounted) {
                onChange(doc);
              }
            },
          },
        });

        editorInstanceRef.current = ink(editorRef.current, options);
      } catch (error) {
        console.error('Failed to load markdown editor:', error);
      }
    };

    initEditor();

    return () => {
      mounted = false;
      if (editorInstanceRef.current) {
        // Clean up editor instance if needed
        editorInstanceRef.current = null;
      }
    };
  }, []);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorInstanceRef.current && value !== undefined) {
      // Only update if the value is different from current editor content
      const currentDoc = editorInstanceRef.current.getDoc?.() || '';
      if (currentDoc !== value) {
        editorInstanceRef.current.update?.(value);
      }
    }
  }, [value]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-1">
        <div
          ref={editorRef}
          className="min-h-[200px] border border-gray-300 rounded-md"
          style={{ minHeight: '200px' }}
        />
        <p className="mt-1 text-xs text-gray-500">
          Rich Markdown editor with live preview and syntax highlighting
        </p>
      </div>
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}
    </div>
  );
}