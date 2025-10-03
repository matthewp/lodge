import { useState, useEffect, useRef } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { FieldComponent } from '../fields';
import { Icon } from '../components/Icon';
import { Dropdown, DropdownItem } from '../components/Dropdown';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionField {
  id: number;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  defaultValue: string;
  sortOrder: number;
}

interface Item {
  id: number;
  collectionId: number;
  slug?: string;
  data: Record<string, any>; // Object from backend
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionDetailProps {
  slug: string;
}

export function CollectionDetail({ slug }: CollectionDetailProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'create_only' | 'upsert'>('create_only');
  const [importResults, setImportResults] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const importDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    loadCollection();
  }, [slug]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = importDialogRef.current;
    if (!dialog) return;

    if (showImportDialog) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showImportDialog]);

  const loadCollection = async () => {
    try {
      // Get all collections to find the one with matching slug
      const collections = await adminAPI.getCollections();
      const foundCollection = collections.find(c => c.slug === slug);

      if (!foundCollection) {
        console.error('Collection not found');
        setLoading(false);
        return;
      }

      setCollection(foundCollection);

      // Load fields for this collection
      const fieldsData = await adminAPI.getCollectionFields(foundCollection.id);
      setFields(fieldsData.sort((a, b) => a.sortOrder - b.sortOrder));

      // Load items for this collection
      const itemsData = await adminAPI.getCollectionItems(foundCollection.id);
      setItems(itemsData);

    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = () => {
    const initialData: Record<string, any> = {};
    fields.forEach(field => {
      const defaultValue = field.defaultValue || '';

      // Convert default values to proper types based on field type
      switch (field.type) {
        case 'number':
          initialData[field.name] = defaultValue ? parseFloat(defaultValue) : null;
          break;
        case 'boolean':
          initialData[field.name] = defaultValue === 'true';
          break;
        case 'markdown':
          initialData[field.name] = {
            md: defaultValue,
            html: ''  // Will be compiled when edited
          };
          break;
        case 'date':
        case 'text':
        case 'textarea':
        case 'email':
        case 'url':
        default:
          initialData[field.name] = defaultValue;
          break;
      }
    });
    setFormData(initialData);
  };

  const handleCreateItem = () => {
    initializeFormData();
    setShowCreateForm(true);
  };

  const handleEditItem = (item: Item) => {
    setFormData(item.data);
    setEditingItem(item);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!collection) return;

    try {
      // Extract slug and status from formData, leave only field data
      const { slug, status, ...fieldData } = formData;

      if (editingItem) {
        await adminAPI.updateItem(editingItem.id, {
          slug: slug,
          data: fieldData,
          status: status || 'draft'
        });
        setEditingItem(null);
      } else {
        await adminAPI.createItem(collection.id, {
          slug: slug,
          data: fieldData,
          status: status || 'draft'
        });
        setShowCreateForm(false);
      }

      await loadCollection();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await adminAPI.deleteItem(itemId);
      await loadCollection();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const isFormValid = () => {
    return fields.every(field => {
      if (field.required) {
        const value = formData[field.name];
        return value && value.trim().length > 0;
      }
      return true;
    });
  };

  const handleExportCSV = async () => {
    if (!collection) return;
    try {
      const blob = await adminAPI.exportCollectionCSV(collection.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection.slug}-export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleImportCSV = async () => {
    if (!collection || !importFile) return;
    setImporting(true);
    try {
      const results = await adminAPI.importCollectionCSV(collection.id, importFile, importMode);
      setImportResults(results);
      if (results.success > 0) {
        await loadCollection(); // Reload items to show imported data
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      alert('Failed to import CSV. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportResults(null);
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl font-bold uppercase">Loading collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="card-flat text-center py-12">
        <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Collection Not Found</h2>
        <a href="/admin/collections" className="btn-primary">
          Back to Collections
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <a
          href="/admin/collections"
          className="text-sm font-bold text-black hover:text-gray-700 mb-4 uppercase tracking-wide inline-block"
        >
          ← Back to Collections
        </a>
        <h2 className="title-flat">
          {collection.name}
        </h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          {collection.description || 'Manage content for this collection'}
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleCreateItem}
          className="btn-primary"
        >
          + New Item
        </button>

        <Dropdown
          trigger="More"
          align="right"
          items={[
            {
              id: 'export',
              label: 'Export CSV',
              icon: 'download',
              onClick: handleExportCSV
            },
            {
              id: 'import',
              label: 'Import CSV',
              icon: 'upload',
              onClick: () => setShowImportDialog(true)
            }
          ]}
        />
      </div>

      <div className="space-y-6">
        {(showCreateForm || editingItem) && (
          <div className="card-flat">
            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              {editingItem ? 'Edit Item' : 'Create New Item'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Slug field */}
                <div>
                  <label className="label-flat">Slug (Optional)</label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onInput={(e) => setFormData({
                      ...formData,
                      slug: (e.target as HTMLInputElement).value
                    })}
                    className="input-flat"
                    placeholder="URL-friendly identifier"
                  />
                </div>

                {/* Dynamic fields */}
                {fields.map(field => (
                  <div key={field.id} className="field-wrapper">
                    <label className="label-flat">
                      {field.label}
                      {field.required && <span className="text-red-600 ml-1">*</span>}
                    </label>
                    <div className="field-container">
                      <FieldComponent
                        field={field}
                        value={formData[field.name]}
                        onChange={(value: any) => setFormData({
                          ...formData,
                          [field.name]: value
                        })}
                      />
                    </div>
                  </div>
                ))}

                {/* Status field */}
                <div>
                  <label className="label-flat">Status</label>
                  <select
                    value={formData.status || 'draft'}
                    onChange={(e) => setFormData({
                      ...formData,
                      status: (e.target as HTMLSelectElement).value
                    })}
                    className="input-flat"
                  >
                    <option value="draft">DRAFT</option>
                    <option value="published">PUBLISHED</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingItem(null);
                    setFormData({});
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!isFormValid()}
                  style={{ opacity: isFormValid() ? 1 : 0.5 }}
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card-flat text-center py-12">
            <Icon name="file" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">No items yet</h3>
            <p className="text-gray-600 mb-6 font-medium">
              Create your first item in this collection
            </p>
            <button
              onClick={handleCreateItem}
              className="btn-primary"
            >
              Create First Item
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map(item => {
              const itemData = item.data;
              const firstField = fields[0];
              const title = firstField ? itemData[firstField.name] : 'Untitled';

              return (
                <div key={item.id} className="card-flat">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-black mb-2 uppercase">{title || 'Untitled'}</h3>
                      {item.slug && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-bold uppercase">Slug:</span> {item.slug}
                        </p>
                      )}
                      <div className="mb-3">
                        <span className={`inline-block px-3 py-1 text-xs font-black uppercase border-2 ${
                          item.status === 'published'
                            ? 'border-green-600 text-green-600'
                            : item.status === 'archived'
                            ? 'border-gray-600 text-gray-600'
                            : 'border-yellow-600 text-yellow-600'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {fields.slice(1, 3).map(field => {
                          const value = itemData[field.name];
                          if (value) {
                            return (
                              <p key={field.id} className="text-gray-700">
                                <span className="font-bold uppercase">{field.label}:</span> {
                                  value.length > 100 ? value.substring(0, 100) + '...' : value
                                }
                              </p>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 font-medium uppercase">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="px-4 py-2 border-4 border-blue-600 text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-colors uppercase text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-4 py-2 border-4 border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors uppercase text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import CSV Dialog */}
      <dialog
        ref={importDialogRef}
        className="p-6 rounded-lg max-w-md w-full backdrop:bg-black backdrop:bg-opacity-50"
        onClose={closeImportDialog}
      >
        <h3 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">
          Import CSV
        </h3>

        {!importResults ? (
          <div className="space-y-4">
            <div>
              <label className="label-flat">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const files = (e.target as HTMLInputElement).files;
                  setImportFile(files ? files[0] : null);
                }}
                className="input-flat"
              />
              <p className="text-xs text-gray-600 mt-1">
                Upload a CSV file with headers matching your collection fields
              </p>
            </div>

            <div>
              <label className="label-flat">Import Mode</label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'create_only' | 'upsert')}
                className="input-flat"
              >
                <option value="create_only">Create Only (skip existing)</option>
                <option value="upsert">Create or Update</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Choose whether to skip existing items or update them
              </p>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={closeImportDialog}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCSV}
                disabled={!importFile || importing}
                className="btn-primary"
                style={{ opacity: (importFile && !importing) ? 1 : 0.5 }}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded">
              <h4 className="font-bold text-green-700">Import Results</h4>
              <p>✅ Successful: {importResults.success}</p>
              <p>❌ Errors: {importResults.errors}</p>
              <p>⏭️ Skipped: {importResults.skipped}</p>
              <p>📊 Total Rows: {importResults.totalRows}</p>
            </div>

            {importResults.errorMessages.length > 0 && (
              <div className="bg-red-50 p-4 rounded max-h-40 overflow-y-auto">
                <h4 className="font-bold text-red-700 mb-2">Errors:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {importResults.errorMessages.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={closeImportDialog}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

/* Add these styles to the field container for proper flat design */
const styles = `
  .field-wrapper input:not([type="checkbox"]),
  .field-wrapper textarea,
  .field-wrapper select {
    @apply w-full p-4 border-4 border-gray-400 focus:outline-none focus:border-black font-medium;
  }

  .field-wrapper .ink-mde-container {
    @apply border-4 border-gray-400 focus-within:border-black;
  }
`;