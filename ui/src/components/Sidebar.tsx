import { Icon } from './Icon';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: 'dashboard' },
    { name: 'Collections', id: 'collections', icon: 'folder' },
    { name: 'Users', id: 'users', icon: 'user' },
    { name: 'Settings', id: 'settings', icon: 'settings' },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col w-64 bg-white border-r-4 border-gray-800 h-full">
      <div className="flex items-center justify-between h-20 px-6 mt-1 bg-white border-b-4 border-gray-800">
        <h1 className="text-2xl font-black text-black tracking-tight">LODGE CMS</h1>
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100"
        >
          <Icon name="x" className="w-6 h-6" />
        </button>
      </div>
      <nav className="mt-6 flex-1 px-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
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

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <div className="hidden lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - overlay */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
