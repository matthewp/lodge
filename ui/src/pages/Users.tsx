import { Icon } from '../components/Icon';

export function Users() {
  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <h2 className="title-flat">Users</h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Manage user accounts and permissions
        </p>
      </div>

      <div className="mb-6">
        <button className="btn-primary">
          + Add User
        </button>
      </div>

      <div className="card-flat">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-4 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-black text-gray-900 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-black text-gray-900 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-black text-gray-900 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-sm font-black text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-gray-200">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 bg-black border-4 border-black flex items-center justify-center">
                        <span className="text-lg font-black text-white">A</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-lg font-black text-gray-900">admin</div>
                      <div className="text-sm font-medium text-gray-600">admin@lodge.cms</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-xs font-black uppercase border-2 border-green-600 text-green-600">
                    Admin
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-600 uppercase">
                  Just now
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="px-4 py-2 border-4 border-blue-600 text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-colors uppercase text-sm">
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Empty state for when no users exist */}
        <div className="text-center py-12 border-t-4 border-gray-300 mt-4" style={{ display: 'none' }}>
          <Icon name="user" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">No users yet</h3>
          <p className="text-gray-600 mb-6 font-medium">
            Add users to manage access to your CMS
          </p>
          <button className="btn-primary">
            Add First User
          </button>
        </div>
      </div>
    </div>
  );
}