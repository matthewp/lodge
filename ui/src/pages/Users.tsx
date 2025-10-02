import { Icon } from '../components/Icon';
import { adminAPI } from '../api/admin';
import { useState, useEffect, useRef } from 'preact/hooks';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'editor',
  });

  const dialogRef = useRef<HTMLDialogElement>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const fetchedUsers = await adminAPI.getUsers();
      setUsers(fetchedUsers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      setIsModalOpen(false);
      setNewUser({ username: '', email: '', password: '', role: 'editor' });
      fetchUsers();
    } catch (err) {
      setError('Failed to create user. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminAPI.deleteUser(id);
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user. Please try again.');
        console.error(err);
      }
    }
  };

  return (
    <div>
      <div className="mb-8 border-b-4 border-gray-300 pb-6">
        <h2 className="title-flat">Users</h2>
        <p className="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide">
          Manage user accounts and permissions
        </p>
      </div>

      <div className="mb-6">
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Add User
        </button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="card-flat">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : users.length > 0 ? (
            <table className="min-w-full">
              <thead>
                <tr className="border-b-4 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-black text-gray-900 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-black text-gray-900 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b-2 border-gray-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 bg-black border-4 border-black flex items-center justify-center">
                            <span className="text-lg font-black text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-lg font-black text-gray-900">{user.username}</div>
                          <div className="text-sm font-medium text-gray-600">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-black uppercase border-2 border-green-600 text-green-600">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-4 py-2 border-4 border-red-600 text-red-600 font-bold hover:bg-red-600 hover:text-white transition-colors uppercase text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 border-t-4 border-gray-300 mt-4">
              <Icon name="user" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">No users yet</h3>
              <p className="text-gray-600 mb-6 font-medium">
                Add users to manage access to your CMS
              </p>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                Add First User
              </button>
            </div>
          )}
        </div>
      </div>

      <dialog ref={dialogRef} className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md backdrop:bg-black backdrop:bg-opacity-50">
        <h2 className="title-flat mb-6">Add New User</h2>
        <form onSubmit={handleCreateUser}>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2 uppercase" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              className="input-text"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2 uppercase" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={newUser.email}
              onChange={handleInputChange}
              className="input-text"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2 uppercase" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              className="input-text"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 uppercase" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={newUser.role}
              onChange={handleInputChange}
              className="input-text"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}