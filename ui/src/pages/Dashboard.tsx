import { useState, useEffect } from 'preact/hooks';
import { adminAPI } from '../api/admin';
import { Sidebar } from '../components/Sidebar';
import { Icon } from '../components/Icon';
import { lazy, Suspense } from 'preact/compat';

// Dynamic imports for code splitting
const Collections = lazy(() => import('./Collections').then(m => ({ default: m.Collections })));
const CollectionDetail = lazy(() => import('./CollectionDetail').then(m => ({ default: m.CollectionDetail })));
const ItemEdit = lazy(() => import('./ItemEdit').then(m => ({ default: m.ItemEdit })));
const Users = lazy(() => import('./Users').then(m => ({ default: m.Users })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
import { Router, navigate } from '../router/Router';

export function Dashboard() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // View Transition is handled by Sidebar, just sync state here
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          setIsDesktop(e.matches);
        });
      } else {
        setIsDesktop(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600 font-bold uppercase">Loading...</div>
      </div>
    );
  }

  const routes = [
    { pattern: '/admin', component: DashboardHome },
    { pattern: '/admin/collections', component: () => <Collections /> },
    { pattern: '/admin/collections/:slug', component: (params?: Record<string, string>) =>
      <CollectionDetail slug={params?.slug || ''} /> },
    { pattern: '/admin/collections/:slug/:id/edit', component: (params?: Record<string, string>) =>
      <ItemEdit collectionSlug={params?.slug || ''} itemId={params?.id || ''} /> },
    { pattern: '/admin/users', component: () => <Users /> },
    { pattern: '/admin/settings', component: () => <Settings /> },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <nav className="bg-white border-b-4 border-gray-800">
          <div className="flex justify-between items-center h-20 px-6">
            <div className="flex items-center">
              {/* Hamburger menu button - mobile only */}
              {!isDesktop && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mr-4 p-2 border-4 border-gray-400 hover:border-black transition-colors"
                  style={{ viewTransitionName: 'hamburger' }}
                >
                  <Icon name="menu" className="w-6 h-6" />
                </button>
              )}
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {currentPage}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-bold text-gray-700 uppercase">
                Welcome, <span className="font-black">{user?.username}</span>
              </span>
              <span className="px-3 py-1 text-xs font-black uppercase border-2 border-black text-black">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-bold uppercase border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 font-bold uppercase">Loading...</div>
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
  const [stats, setStats] = useState({ collections: 0, items: 0, users: 0, apiKeys: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await adminAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <h2 className="title-flat">
          Dashboard
        </h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Welcome to Lodge CMS! Here's an overview of your content.
        </p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-black flex items-center justify-center">
                  <Icon name="folder" className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Collections
                  </dt>
                  <dd className="text-3xl font-black text-gray-900">
                    {loadingStats ? '...' : stats.collections}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-600 border-4 border-green-600 flex items-center justify-center">
                  <Icon name="document" className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Items
                  </dt>
                  <dd className="text-3xl font-black text-gray-900">
                    {loadingStats ? '...' : stats.items}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white border-4 border-black p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-500 border-4 border-yellow-500 flex items-center justify-center">
                  <Icon name="user" className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Users
                  </dt>
                  <dd className="text-3xl font-black text-gray-900">
                    {loadingStats ? '...' : stats.users}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <h3 className="text-xl font-black text-gray-900 mb-6 uppercase">
            Getting Started
          </h3>
          <div className="text-gray-700 space-y-4">
            <p className="font-bold">Welcome to Lodge CMS! Here's how to get started:</p>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="inline-block w-8 h-8 bg-black text-white font-black text-center leading-8 mr-3">1</span>
                <span className="font-medium">Create your first collection to define content types</span>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-8 h-8 bg-black text-white font-black text-center leading-8 mr-3">2</span>
                <span className="font-medium">Add content items to your collections</span>
              </div>
              <div className="flex items-start">
                <span className="inline-block w-8 h-8 bg-black text-white font-black text-center leading-8 mr-3">3</span>
                <span className="font-medium">Use the API to access your content from your applications</span>
              </div>
            </div>
            <div className="mt-6">
              <a
                href="/admin/collections"
                className="inline-block px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-wide border-4 border-black hover:bg-gray-800 transition-colors"
              >
                Get Started <Icon name="arrow" className="w-4 h-4 inline ml-1" /> Create Collection
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card-flat">
            <h3 className="text-lg font-black text-gray-900 mb-4 uppercase">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <a
                href="/admin/collections"
                className="block p-4 border-4 border-gray-400 hover:border-black transition-colors"
              >
                <Icon name="arrow" className="w-4 h-4 inline mr-2" />
                <span className="font-bold uppercase">Manage Collections</span>
              </a>
              <a
                href="/admin/settings"
                className="block p-4 border-4 border-gray-400 hover:border-black transition-colors"
              >
                <Icon name="arrow" className="w-4 h-4 inline mr-2" />
                <span className="font-bold uppercase">API Settings</span>
              </a>
              <a
                href="/admin/users"
                className="block p-4 border-4 border-gray-400 hover:border-black transition-colors"
              >
                <Icon name="arrow" className="w-4 h-4 inline mr-2" />
                <span className="font-bold uppercase">User Management</span>
              </a>
            </div>
          </div>

          <div className="card-flat">
            <h3 className="text-lg font-black text-gray-900 mb-4 uppercase">
              System Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border-2 border-gray-300">
                <span className="font-bold uppercase text-sm">Database</span>
                <span className="px-2 py-1 text-xs font-black uppercase border-2 border-green-600 text-green-600">
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-gray-300">
                <span className="font-bold uppercase text-sm">API</span>
                <span className="px-2 py-1 text-xs font-black uppercase border-2 border-green-600 text-green-600">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-gray-300">
                <span className="font-bold uppercase text-sm">Version</span>
                <span className="font-mono font-bold">v0.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}