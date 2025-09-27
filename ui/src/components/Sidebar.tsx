interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: '📊' },
    { name: 'Collections', id: 'collections', icon: '📁' },
    { name: 'Users', id: 'users', icon: '👥' },
    { name: 'Settings', id: 'settings', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-16 px-4 bg-gray-900">
        <h1 className="text-xl font-semibold text-white">Lodge CMS</h1>
      </div>
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors
              ${
                currentPage === item.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            <span className="mr-3 flex-shrink-0 text-lg" aria-hidden="true">
              {item.icon}
            </span>
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}