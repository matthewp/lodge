import { useState } from 'preact/hooks';
import { adminAPI } from '../api/admin';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await adminAPI.login(username, password);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 border-4 border-black w-96">
        <h1 className="text-4xl font-black mb-8 text-center tracking-tight">LODGE CMS</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-4 border-red-500 text-red-700 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full p-4 border-4 border-gray-400 focus:outline-none focus:border-black font-medium"
              placeholder="Enter username"
              value={username}
              onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full p-4 border-4 border-gray-400 focus:outline-none focus:border-black font-medium"
              placeholder="Enter password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 px-6 font-black text-lg tracking-wide border-4 border-black hover:bg-gray-800 disabled:opacity-50 transition-colors uppercase"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}