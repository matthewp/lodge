import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { Icon } from '../components/Icon';

interface APIKey {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export function Settings() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const keys = await adminAPI.getAPIKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: Event) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const result = await adminAPI.createAPIKey(newKeyName.trim());
      setCreatedKey(result.key);
      setNewKeyName('');
      setShowCreateForm(false);
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key: ' + (error as Error).message);
    }
  };

  const handleDeleteKey = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteAPIKey(id);
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key: ' + (error as Error).message);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => {
        setCopyState('idle');
      }, 5000);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  };

  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <h2 className="title-flat">Settings</h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Configure your CMS settings and preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* API Keys Section */}
        <div className="card-flat">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase">
                API Keys
              </h3>
              <p className="mt-1 text-sm text-gray-600 font-medium">
                Manage API keys for accessing your content via the REST API
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              + New API Key
            </button>
          </div>

          {/* Created Key Display */}
          {createdKey && (
            <div className="mb-6 p-4 bg-green-50 border-4 border-green-600">
              <h4 className="text-sm font-black text-green-900 mb-2 uppercase">
                API Key Created Successfully
              </h4>
              <p className="text-sm text-green-700 mb-3 font-medium">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center space-x-3 min-w-0">
                <code className="flex-1 min-w-0 p-3 bg-white border-4 border-green-600 text-green-900 font-mono font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className={`flex-shrink-0 px-4 py-3 border-4 font-bold uppercase text-sm transition-colors ${
                    copyState === 'copied'
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                  }`}
                >
                  {copyState === 'copied' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="mt-4 text-sm font-bold text-green-700 hover:text-green-900 uppercase"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-6 p-6 bg-gray-50 border-4 border-gray-400">
              <form onSubmit={handleCreateKey}>
                <div className="mb-4">
                  <label className="label-flat">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
                    className="input-flat"
                    placeholder="e.g., Production App"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    A descriptive name to help you identify this key
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary">
                    Create Key
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewKeyName('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Keys List */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 font-bold uppercase">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 border-4 border-gray-300">
              <Icon name="key" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-black text-gray-900 mb-2 uppercase">No API keys yet</h4>
              <p className="text-gray-600 mb-6 font-medium">
                Create your first API key to start using the REST API
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                Create First Key
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 border-4 border-gray-300 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-lg uppercase">{key.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-bold uppercase">Key:</span>{' '}
                      <code className="font-mono font-bold">{key.keyPrefix}...</code>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-bold uppercase">Created:</span>{' '}
                      {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <>
                          {' | '}
                          <span className="font-bold uppercase">Last used:</span>{' '}
                          {new Date(key.lastUsedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 text-xs font-black uppercase border-2 ${
                        key.isActive
                          ? 'border-green-600 text-green-600'
                          : 'border-red-600 text-red-600'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id, key.name)}
                    className="px-4 py-2 border-4 border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors uppercase"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="card-flat">
          <h3 className="text-xl font-black text-gray-900 mb-4 uppercase">API Usage</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-2">Authentication</h4>
              <p className="text-gray-700 mb-2">Include your API key in the request header:</p>
              <code className="block p-4 bg-gray-100 border-4 border-gray-400 font-mono text-sm">
                X-API-Key: your-api-key-here
              </code>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-2">Example Request</h4>
              <code className="block p-4 bg-gray-100 border-4 border-gray-400 font-mono text-sm whitespace-pre">
{`curl -H "X-API-Key: your-api-key-here" \\
  https://your-domain.com/api/collections/blog-posts`}
              </code>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-2">Available Endpoints</h4>
              <ul className="space-y-2 font-mono text-sm">
                <li className="p-2 border-2 border-gray-300">
                  <span className="font-bold">GET</span> /api/collections - List all collections
                </li>
                <li className="p-2 border-2 border-gray-300">
                  <span className="font-bold">GET</span> /api/collections/{'{slug}'} - Get collection items
                </li>
                <li className="p-2 border-2 border-gray-300">
                  <span className="font-bold">GET</span> /api/collections/{'{slug}'}/{'{id}'} - Get specific item
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}