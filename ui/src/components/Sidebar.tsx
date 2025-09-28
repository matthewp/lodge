import { Icon } from './Icon';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: 'dashboard' },
    { name: 'Collections', id: 'collections', icon: 'folder' },
    { name: 'Users', id: 'users', icon: 'user' },
    { name: 'Settings', id: 'settings', icon: 'settings' },
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r-4 border-gray-800">
      <div className="flex items-center h-20 px-6 mt-1 bg-white border-b-4 border-gray-800">
        <h1 className="text-2xl font-black text-black tracking-tight">LODGE CMS</h1>
      </div>
      <nav className="mt-6 flex-1 px-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              group flex items-center w-full px-4 py-4 text-sm font-bold border-4 transition-colors uppercase tracking-wide
              ${
                currentPage === item.id
                  ? 'bg-black text-white border-black'
                  : 'text-black border-gray-400 hover:border-black hover:bg-gray-100'
              }
            `}
          >
            <Icon
              name={item.icon}
              className="mr-4 flex-shrink-0 w-5 h-5"
            />
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
