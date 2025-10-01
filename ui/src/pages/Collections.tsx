import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { Icon } from '../components/Icon';

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

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await adminAPI.deleteCollection(id);
      await loadCollections();
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const handleManageFields = async (collection: Collection) => {
    setManagingFields(collection);
    await loadFields(collection.id);
  };

  const handleCreateField = async (e: Event) => {
    e.preventDefault();
    if (!managingFields || !newField.name.trim() || !newField.label.trim()) return;

    try {
      await adminAPI.createCollectionField(managingFields.id, {
        ...newField,
        sortOrder: fields.length
      });
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

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
      await adminAPI.deleteCollectionField(fieldId);
      if (managingFields) {
        await loadFields(managingFields.id);
      }
    } catch (error) {
      console.error('Failed to delete field:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  if (managingFields) {
    return (
      <div>
        <div className="mb-8 border-b-4 border-gray-300 pb-6">
          <button
            onClick={() => setManagingFields(null)}
            className="text-sm font-bold text-black hover:text-gray-700 mb-4 uppercase tracking-wide"
          >
            ← Back to Collections
          </button>
          <h2 className="title-flat">
            {managingFields.name} Fields
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
            Manage the fields for this collection
          </p>
        </div>

        <div className="space-y-6">
          {showFieldForm && (
            <div className="card-flat">
              <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">
                Create New Field
              </h3>
              <form onSubmit={handleCreateField}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="label-flat">Field Name</label>
                    <input
                      type="text"
                      value={newField.name}
                      onInput={(e) => setNewField({
                        ...newField,
                        name: (e.target as HTMLInputElement).value
                      })}
                      className="input-flat"
                      placeholder="e.g., title"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-flat">Label</label>
                    <input
                      type="text"
                      value={newField.label}
                      onInput={(e) => setNewField({
                        ...newField,
                        label: (e.target as HTMLInputElement).value
                      })}
                      className="input-flat"
                      placeholder="e.g., Title"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-flat">Type</label>
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField({
                        ...newField,
                        type: (e.target as HTMLSelectElement).value
                      })}
                      className="input-flat"
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
                    <label className="label-flat">Placeholder</label>
                    <input
                      type="text"
                      value={newField.placeholder}
                      onInput={(e) => setNewField({
                        ...newField,
                        placeholder: (e.target as HTMLInputElement).value
                      })}
                      className="input-flat"
                      placeholder="Optional placeholder text"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-flat">Default Value</label>
                    <input
                      type="text"
                      value={newField.defaultValue}
                      onInput={(e) => setNewField({
                        ...newField,
                        defaultValue: (e.target as HTMLInputElement).value
                      })}
                      className="input-flat"
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
                        className="h-6 w-6 border-4 border-gray-400 text-black focus:ring-0"
                      />
                      <label htmlFor="required" className="ml-3 text-sm font-bold text-gray-900 uppercase">
                        Required field
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowFieldForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Field
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card-flat">
            {fields.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="tag" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">No fields yet</h3>
                <p className="text-gray-600 mb-6 font-medium">
                  Add fields to define the structure of your content
                </p>
                <button
                  onClick={() => setShowFieldForm(true)}
                  className="btn-primary"
                >
                  Create First Field
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black uppercase">Fields</h3>
                  <button
                    onClick={() => setShowFieldForm(true)}
                    className="btn-primary"
                  >
                    + Add Field
                  </button>
                </div>
                {fields.map((field) => (
                  <div key={field.id} className="border-4 border-gray-300 p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">{field.label}</h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-bold uppercase">Name:</span> {field.name} |{' '}
                        <span className="font-bold uppercase">Type:</span> {field.type}
                        {field.required && <span className="ml-2 text-red-600 font-bold">REQUIRED</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="px-4 py-2 border-4 border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors uppercase"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <h2 className="title-flat">Collections</h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Manage your content types and their field definitions
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          + New Collection
        </button>
      </div>

      <div className="space-y-6">
        {showCreateForm && (
          <div className="card-flat">
            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Create New Collection
            </h3>
            <form onSubmit={handleCreateCollection}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label-flat">Name</label>
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
                    className="input-flat"
                    placeholder="e.g., Blog Posts"
                    required
                  />
                </div>
                <div>
                  <label className="label-flat">Slug</label>
                  <input
                    type="text"
                    value={newCollection.slug}
                    onInput={(e) => setNewCollection({
                      ...newCollection,
                      slug: (e.target as HTMLInputElement).value
                    })}
                    className="input-flat"
                    placeholder="e.g., blog-posts"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-flat">Description</label>
                  <textarea
                    rows={3}
                    value={newCollection.description}
                    onInput={(e) => setNewCollection({
                      ...newCollection,
                      description: (e.target as HTMLTextAreaElement).value
                    })}
                    className="input-flat"
                    placeholder="Optional description of this collection"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        )}

        {editingCollection && (
          <div className="card-flat">
            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">
              Edit Collection
            </h3>
            <form onSubmit={handleEditCollection}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="label-flat">Name</label>
                  <input
                    type="text"
                    value={editingCollection.name}
                    onInput={(e) => setEditingCollection({
                      ...editingCollection,
                      name: (e.target as HTMLInputElement).value
                    })}
                    className="input-flat"
                    required
                  />
                </div>
                <div>
                  <label className="label-flat">Slug</label>
                  <input
                    type="text"
                    value={editingCollection.slug}
                    onInput={(e) => setEditingCollection({
                      ...editingCollection,
                      slug: (e.target as HTMLInputElement).value
                    })}
                    className="input-flat"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-flat">Description</label>
                  <textarea
                    rows={3}
                    value={editingCollection.description}
                    onInput={(e) => setEditingCollection({
                      ...editingCollection,
                      description: (e.target as HTMLTextAreaElement).value
                    })}
                    className="input-flat"
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">Loading collections...</div>
          </div>
        ) : collections.length === 0 ? (
          <div className="card-flat text-center py-12">
            <Icon name="box" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">No collections yet</h3>
            <p className="text-gray-600 mb-6 font-medium">
              Create your first collection to start managing content
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create First Collection
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <div key={collection.id} className="card-flat">
                <h3 className="text-xl font-black mb-2 uppercase">{collection.name}</h3>
                <p className="text-sm text-gray-600 mb-4 font-medium">
                  <span className="font-bold">SLUG:</span> {collection.slug}
                </p>
                {collection.description && (
                  <p className="text-gray-700 mb-4">{collection.description}</p>
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleManageFields(collection)}
                    className="flex-1 px-4 py-2 border-4 border-blue-600 text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-colors uppercase text-sm"
                  >
                    Fields
                  </button>
                  <button
                    onClick={() => setEditingCollection(collection)}
                    className="flex-1 px-4 py-2 border-4 border-gray-600 text-gray-600 font-bold hover:bg-gray-600 hover:text-white transition-colors uppercase text-sm"
                  >
                    Edit
                  </button>
                  <a
                    href={`/admin/collections/${collection.slug}`}
                    className="flex-1 px-4 py-2 border-4 border-green-600 text-green-600 font-bold hover:bg-green-600 hover:text-white transition-colors uppercase text-sm text-center"
                  >
                    Items
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}