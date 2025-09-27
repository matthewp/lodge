import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';

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

export function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [managingFields, setManagingFields] = useState<Collection | null>(null);
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    defaultValue: ''
  });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await adminAPI.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async (collectionId: number) => {
    try {
      const data = await adminAPI.getCollectionFields(collectionId);
      setFields(data);
    } catch (error) {
      console.error('Failed to load fields:', error);
    }
  };

  const handleCreateCollection = async (e: Event) => {
    e.preventDefault();
    if (!newCollection.name.trim() || !newCollection.slug.trim()) return;

    try {
      await adminAPI.createCollection(newCollection);
      setNewCollection({ name: '', slug: '', description: '' });
      setShowCreateForm(false);
      await loadCollections();
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleEditCollection = async (e: Event) => {
    e.preventDefault();
    if (!editingCollection) return;

    try {
      await adminAPI.updateCollection(editingCollection.id, {
        name: editingCollection.name,
        slug: editingCollection.slug,
        description: editingCollection.description
      });
      setEditingCollection(null);
      await loadCollections();
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handleCreateField = async (e: Event) => {
    e.preventDefault();
    if (!managingFields || !newField.name.trim() || !newField.label.trim()) return;

    try {
      await adminAPI.createCollectionField(managingFields.id, newField);
      setNewField({
        name: '',
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        defaultValue: ''
      });
      setShowFieldForm(false);
      await loadFields(managingFields.id);
    } catch (error) {
      console.error('Failed to create field:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (managingFields) {
    return (
      <div>
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setManagingFields(null)}
              className="text-sm text-indigo-600 hover:text-indigo-500 mb-2"
            >
              ← Back to Collections
            </button>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {managingFields.name} Fields
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage the fields for this collection
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowFieldForm(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              New Field
            </button>
          </div>
        </div>

        <div className="mt-8">
          {showFieldForm && (
            <div className="mb-6 bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Create New Field
                </h3>
                <form onSubmit={handleCreateField}>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={newField.name}
                        onInput={(e) => setNewField({
                          ...newField,
                          name: (e.target as HTMLInputElement).value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Label
                      </label>
                      <input
                        type="text"
                        value={newField.label}
                        onInput={(e) => setNewField({
                          ...newField,
                          label: (e.target as HTMLInputElement).value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        value={newField.type}
                        onChange={(e) => setNewField({
                          ...newField,
                          type: (e.target as HTMLSelectElement).value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="markdown">Markdown</option>
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={newField.placeholder}
                        onInput={(e) => setNewField({
                          ...newField,
                          placeholder: (e.target as HTMLInputElement).value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Optional placeholder text"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={newField.defaultValue}
                        onInput={(e) => setNewField({
                          ...newField,
                          defaultValue: (e.target as HTMLInputElement).value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Optional default value"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center">
                        <input
                          id="required"
                          type="checkbox"
                          checked={newField.required}
                          onChange={(e) => setNewField({
                            ...newField,
                            required: (e.target as HTMLInputElement).checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
                          Required field
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowFieldForm(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create Field
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {fields.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🏷️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                  <p className="text-gray-500 mb-6">
                    Add fields to define the structure of your content
                  </p>
                  <button
                    onClick={() => setShowFieldForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    Create First Field
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Label
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Required
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fields.map((field) => (
                        <tr key={field.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {field.required ? 'Yes' : 'No'}
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

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Collections
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your content types and their field definitions
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            New Collection
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {showCreateForm && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Create New Collection
              </h3>
              <form onSubmit={handleCreateCollection}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newCollection.name}
                      onInput={(e) => {
                        const name = (e.target as HTMLInputElement).value;
                        setNewCollection({
                          ...newCollection,
                          name,
                          slug: generateSlug(name)
                        });
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., Blog Posts"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={newCollection.slug}
                      onInput={(e) => setNewCollection({
                        ...newCollection,
                        slug: (e.target as HTMLInputElement).value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., blog-posts"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newCollection.description}
                      onInput={(e) => setNewCollection({
                        ...newCollection,
                        description: (e.target as HTMLTextAreaElement).value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Optional description of this collection"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingCollection && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Edit Collection
              </h3>
              <form onSubmit={handleEditCollection}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingCollection.name}
                      onInput={(e) => setEditingCollection({
                        ...editingCollection,
                        name: (e.target as HTMLInputElement).value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={editingCollection.slug}
                      onInput={(e) => setEditingCollection({
                        ...editingCollection,
                        slug: (e.target as HTMLInputElement).value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editingCollection.description}
                      onInput={(e) => setEditingCollection({
                        ...editingCollection,
                        description: (e.target as HTMLTextAreaElement).value
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingCollection(null)}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Update Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading collections...</div>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first collection to start managing content
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Collection
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
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
                    {collections.map((collection) => (
                      <tr key={collection.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`/admin/collections/${collection.slug}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                          >
                            {collection.name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">{collection.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{collection.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {collection.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setManagingFields(collection);
                              loadFields(collection.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Manage Fields
                          </button>
                          <button
                            onClick={() => setEditingCollection(collection)}
                            className="text-blue-600 hover:text-blue-900"
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