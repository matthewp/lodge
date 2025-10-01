import { useEffect, useRef } from 'preact/hooks';
import { marked } from 'marked';

// Configure marked options for security and consistency
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false, // We'll handle sanitization separately if needed
});

interface MarkdownValue {
  md: string;
  html: string;
}

interface MarkdownFieldProps {
  name: string;
  label: string;
  value: MarkdownValue | string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: MarkdownValue) => void;
}

export function MarkdownField({ name, label, value, placeholder, required, onChange }: MarkdownFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);

  // Get the markdown string whether value is string or MarkdownValue
  const getMarkdownString = (val: MarkdownValue | string): string => {
    if (typeof val === 'string') {
      return val;
    }
    return val?.md || '';
  };

  // Compile markdown to HTML
  const compileMarkdown = (md: string): string => {
    try {
      return marked(md);
    } catch (error) {
      console.error('Failed to compile markdown:', error);
      return '';
    }
  };

  useEffect(() => {
    let mounted = true;

    const initEditor = async () => {
      if (!editorRef.current || editorInstanceRef.current) return;

      try {
        // Dynamic import of ink-mde
        const { ink, defineOptions } = await import('ink-mde');

        if (!mounted) return;

        const initialDoc = getMarkdownString(value);

        const options = defineOptions({
          doc: initialDoc,
          placeholder: placeholder || "Write your markdown here...",
          interface: {
            attribution: false, // Hide "powered by ink-mde"
          },
          hooks: {
            afterUpdate: (doc: string) => {
              if (mounted) {
                onChange({
                  md: doc,
                  html: compileMarkdown(doc)
                });
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
      const newDoc = getMarkdownString(value);
      // Only update if the value is different from current editor content
      const currentDoc = editorInstanceRef.current.getDoc?.() || '';
      if (currentDoc !== newDoc) {
        editorInstanceRef.current.update?.(newDoc);
      }
    }
  }, [value]);

  return (
    <div>
      <div
        ref={editorRef}
        className="markdown-editor-container border-4 border-gray-400 focus-within:border-black font-medium"
        style={{ minHeight: '400px', maxHeight: '600px' }}
      />
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}
      <style>{`
        .markdown-editor-container .ink-mde {
          border: none !important;
          box-shadow: none !important;
          min-height: 400px;
          max-height: 600px;
          overflow: hidden;
        }
        .markdown-editor-container .ink-mde-editor {
          min-height: 380px;
          max-height: 580px;
        }
        .markdown-editor-container .cm-editor {
          min-height: 350px;
          max-height: 550px;
        }
        .markdown-editor-container .cm-scroller {
          min-height: 350px;
          max-height: 550px;
          font-family: inherit;
          overflow-y: auto;
        }
        .markdown-editor-container .cm-content {
          min-height: 330px !important;
          padding: 12px;
        }
        .markdown-editor-container .cm-line {
          padding-left: 0;
          padding-right: 0;
        }
        .markdown-editor-container .cm-focused {
          outline: none !important;
        }
      `}</style>
    </div>
  );
}