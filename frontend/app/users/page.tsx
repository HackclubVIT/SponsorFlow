'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '../../components/NotificationBell';
import { getUsers } from '../../actions/users';

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchUsers = async () => {
        try {
          const data = await getUsers();
          setUsers(data);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchUsers();
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <span className="font-semibold text-gray-900">SponsorFlow Admin</span>
            </Link>
            
            <nav className="hidden md:flex gap-6">
              <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Analytics</Link>
              <Link href="/companies" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Directory</Link>
              <Link href="/users" className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 py-5">Users</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-5 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{session?.user?.name}</span>
                <span className="text-xs text-gray-500">{(session?.user as any)?.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Team Members</h1>
            <p className="mt-2 text-sm text-gray-500">Manage all users in your SponsorFlow organization.</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px] relative">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </div>
              </div>
            )}
            
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold text-gray-900 border-b border-gray-200">Name</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Email</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Role</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 pl-6 pr-3">
                      <div className="font-medium text-gray-900 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-1 ring-indigo-600/20">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-gray-500">
                      {u.email}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        u.role === 'ADMIN' 
                          ? 'bg-purple-50 text-purple-700 ring-purple-600/20' 
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!loading && users.length === 0 && (
              <div className="text-center py-16 px-6">
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no registered users in the system yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
