import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';

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
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure your CMS settings and preferences
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* API Keys Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  API Keys
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage API keys for accessing your content programmatically
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create New Key
              </button>
            </div>

            {/* New Key Created Alert */}
            {createdKey && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      API Key Created Successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p className="mb-2">Store this key securely - it won't be shown again:</p>
                      <div className="bg-white border rounded p-2 font-mono text-xs break-all">
                        {createdKey}
                      </div>
                      <button
                        onClick={() => copyToClipboard(createdKey)}
                        className={`mt-2 text-xs underline transition-colors ${
                          copyState === 'copied'
                            ? 'text-blue-600 hover:text-blue-700'
                            : 'text-green-800 hover:text-green-900'
                        }`}
                      >
                        {copyState === 'copied' ? 'Copied!' : 'Copy to clipboard'}
                      </button>
                    </div>
                    <button
                      onClick={() => setCreatedKey(null)}
                      className="mt-2 text-green-800 hover:text-green-900 text-xs"
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                <form onSubmit={handleCreateKey}>
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Key Name
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Production Frontend"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* API Keys List */}
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading API keys...</div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🔑</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first API key to start accessing your content programmatically
                </p>
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
                        Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Used
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{key.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">{key.keyPrefix}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.lastUsedAt || 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteKey(key.id, key.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              General Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Site Title
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  defaultValue="Lodge CMS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Site Description
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  defaultValue="A cozy headless CMS"
                />
              </div>
            </div>
          </div>
        </div>


        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Database
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    SQLite Database Connected
                  </p>
                  <p className="text-sm text-gray-500">
                    Database file: lodge.db
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}