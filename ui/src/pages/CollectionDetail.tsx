import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { FieldComponent } from '../fields';

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
  data: string; // JSON string from backend
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
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCollection();
  }, [slug]);

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
    const initialData: Record<string, string> = {};
    fields.forEach(field => {
      initialData[field.name] = field.defaultValue || '';
    });
    setFormData(initialData);
  };

  const handleCreateItem = () => {
    initializeFormData();
    setShowCreateForm(true);
  };

  const handleEditItem = (item: Item) => {
    try {
      const parsedData = JSON.parse(item.data);
      setFormData(parsedData);
      setEditingItem(item);
    } catch (error) {
      console.error('Failed to parse item data:', error);
      setFormData({});
      setEditingItem(item);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const isFormValid = () => {
    return fields.every(field => {
      if (!field.required) return true;
      const value = formData[field.name] || '';
      return value.trim() !== '';
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!collection) return;

    try {
      if (editingItem) {
        // Update existing item
        await adminAPI.updateItem(editingItem.id, {
          data: formData,
          status: 'draft' // Could be made configurable later
        });
      } else {
        // Create new item
        await adminAPI.createItem(collection.id, {
          data: formData,
          status: 'draft' // Could be made configurable later
        });
      }

      // Refresh items list
      const itemsData = await adminAPI.getCollectionItems(collection.id);
      setItems(itemsData);

      // Close form and reset state
      setShowCreateForm(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      console.error('Failed to save item:', error);
      // TODO: Show error to user
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingItem(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Loading collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">❌</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Collection not found</h3>
        <p className="text-gray-500 mb-6">
          The collection "{slug}" does not exist.
        </p>
        <a
          href="/admin/collections"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          ← Back to Collections
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <a
            href="/admin/collections"
            className="text-sm text-indigo-600 hover:text-indigo-500 mb-2 inline-block"
          >
            ← Back to Collections
          </a>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {collection.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {collection.description || 'Manage items in this collection'}
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleCreateItem}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            New Item
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Create/Edit Form */}
        {(showCreateForm || editingItem) && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'Create New Item'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {fields.map((field) => (
                    <FieldComponent
                      key={field.id}
                      type={field.type}
                      name={field.name}
                      label={field.label}
                      value={formData[field.name] || ''}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(value) => handleFieldChange(field.name, value)}
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid()}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                      isFormValid()
                        ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                        : 'bg-gray-400 cursor-not-allowed'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {fields.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No fields defined</h3>
                <p className="text-gray-500 mb-6">
                  You need to define fields for this collection before you can create items.
                </p>
                <a
                  href="/admin/collections"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Manage Collection Fields
                </a>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first item in this collection
                </p>
                <button
                  onClick={handleCreateItem}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Create First Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      {fields.slice(0, 3).map((field) => (
                        <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.id}
                        </td>
                        {fields.slice(0, 3).map((field) => {
                          let displayValue = '—';
                          try {
                            const parsedData = JSON.parse(item.data);
                            displayValue = parsedData[field.name] || '—';
                          } catch (error) {
                            console.error('Failed to parse item data for display:', error);
                          }
                          return (
                            <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {displayValue}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}