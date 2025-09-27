import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { Sidebar } from '../components/Sidebar';
import { lazy, Suspense } from 'preact/compat';

// Dynamic imports for code splitting
const Collections = lazy(() => import('./Collections').then(m => ({ default: m.Collections })));
const CollectionDetail = lazy(() => import('./CollectionDetail').then(m => ({ default: m.CollectionDetail })));
const Users = lazy(() => import('./Users').then(m => ({ default: m.Users })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
import { Router, navigate } from '../router/Router';

export function Dashboard() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await adminAPI.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
        // If we can't get user info, redirect to login
        adminAPI.logout();
        window.location.reload();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    // Update current page based on URL
    const updatePageFromURL = () => {
      const path = window.location.pathname;
      if (path === '/admin/collections') setCurrentPage('collections');
      else if (path === '/admin/users') setCurrentPage('users');
      else if (path === '/admin/settings') setCurrentPage('settings');
      else setCurrentPage('dashboard');
    };

    updatePageFromURL();

    const handleNavigation = () => {
      updatePageFromURL();
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleLogout = async () => {
    await adminAPI.logout();
    window.location.reload();
  };

  const handleNavigate = (page: string) => {
    if (page === 'dashboard') {
      navigate('/admin');
    } else {
      navigate(`/admin/${page}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const routes = [
    { pattern: '/admin', component: DashboardHome },
    { pattern: '/admin/collections', component: () => <Collections /> },
    { pattern: '/admin/collections/:slug', component: (params?: Record<string, string>) =>
      <CollectionDetail slug={params?.slug || ''} /> },
    { pattern: '/admin/users', component: () => <Users /> },
    { pattern: '/admin/settings', component: () => <Settings /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <nav className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 capitalize">
                  {currentPage}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user?.username}</span>
                </span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                  {user?.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading...</div>
                </div>
              }>
                <Router routes={routes} fallback={DashboardHome} />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardHome() {
  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to Lodge CMS! Here's an overview of your content.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📁</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Collections
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📄</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Entries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      1
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Getting Started
            </h3>
            <div className="prose text-gray-600">
              <p>Welcome to Lodge CMS! 🎉 Here's how to get started:</p>
              <ol className="list-decimal list-inside space-y-2 mt-4">
                <li>Create your first collection to define content types</li>
                <li>Add content entries to your collections</li>
                <li>Use the API to access your content from your applications</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}