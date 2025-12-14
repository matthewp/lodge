import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { FieldComponent } from '../fields';
import { navigate } from '../router/Router';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
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
  data: Record<string, any>;
  status: string;
}

interface ItemEditProps {
  collectionSlug: string;
  itemId: string;
}

export function ItemEdit({ collectionSlug, itemId }: ItemEditProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [fields, setFields] = useState<CollectionField[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [collectionSlug, itemId]);

  const loadData = async () => {
    try {
      // Get collection
      const collections = await adminAPI.getCollections();
      const foundCollection = collections.find(c => c.slug === collectionSlug);

      if (!foundCollection) {
        console.error('Collection not found');
        setLoading(false);
        return;
      }

      setCollection(foundCollection);

      // Load fields
      const fieldsData = await adminAPI.getCollectionFields(foundCollection.id);
      setFields(fieldsData.sort((a, b) => a.sortOrder - b.sortOrder));

      // Load item
      const itemData = await adminAPI.getItem(parseInt(itemId));
      setItem(itemData);

      // Initialize form data
      setFormData({
        ...itemData.data,
        slug: itemData.slug || '',
        status: itemData.status || 'draft'
      });

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!item) return;

    setSaving(true);
    try {
      const { slug, status, ...fieldData } = formData;

      await adminAPI.updateItem(item.id, {
        slug: slug,
        data: fieldData,
        status: status || 'draft'
      });

      // Navigate back to collection
      navigate(`/admin/collections/${collectionSlug}`);
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return fields.every(field => {
      if (field.required) {
        const value = formData[field.name];
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        return value != null;
      }
      return true;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl font-bold uppercase">Loading...</div>
      </div>
    );
  }

  if (!collection || !item) {
    return (
      <div className="card-flat text-center py-12">
        <h2 className="text-2xl font-black text-gray-900 mb-4 uppercase">Item Not Found</h2>
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
          href={`/admin/collections/${collectionSlug}`}
          className="text-sm font-bold text-black hover:text-gray-700 mb-4 uppercase tracking-wide inline-block"
        >
          ← Back to {collection.name}
        </a>
        <h2 className="title-flat">
          Edit Item
        </h2>
      </div>

      <div className="card-flat">
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
            <a
              href={`/admin/collections/${collectionSlug}`}
              className="btn-secondary"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="btn-primary"
              disabled={!isFormValid() || saving}
              style={{ opacity: isFormValid() && !saving ? 1 : 0.5 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
