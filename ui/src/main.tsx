import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { LoginPage } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { adminAPI } from './api/admin';

async function init() {
  // Only load polyfill if Navigation API is not supported
  if (!('navigation' in window)) {
    await import('@virtualstate/navigation/polyfill');
  }

  render(<App />, document.getElementById('app')!);
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      if (adminAPI.isAuthenticated()) {
        try {
          const user = await adminAPI.getCurrentUser();
          setIsAuthenticated(!!user);
        } catch {
          setIsAuthenticated(false);
          adminAPI.logout(); // Clear invalid token
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show appropriate component based on auth state
  return isAuthenticated ? <Dashboard /> : <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

init();