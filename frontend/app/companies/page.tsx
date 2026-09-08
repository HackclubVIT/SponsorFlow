'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { NotificationBell } from '../../components/NotificationBell';

const STATUS_BADGES: Record<string, string> = {
  'ASSIGNED': 'bg-blue-50 text-blue-700 ring-blue-700/10',
  'EMAIL_DRAFTED': 'bg-amber-50 text-amber-700 ring-amber-700/10',
  'EMAIL_SENT': 'bg-purple-50 text-purple-700 ring-purple-700/10',
  'OPENED': 'bg-cyan-50 text-cyan-700 ring-cyan-700/10',
  'REPLIED': 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
  'INTERESTED': 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  'NEGOTIATING': 'bg-yellow-50 text-yellow-800 ring-yellow-800/10',
  'CONFIRMED': 'bg-green-50 text-green-700 ring-green-600/20',
  'REJECTED': 'bg-rose-50 text-rose-700 ring-rose-700/10',
  'NOT_ASSIGNED': 'bg-gray-50 text-gray-600 ring-gray-500/10',
};

import { getCompanies, deleteCompany, importCompanies } from '../../actions/companies';
import { syncInboxReplies } from '../../actions/gmail';
import { bulkChangeStatus, bulkAssignCompanies } from '../../actions/mutations';
import { getUsers } from '../../actions/users';
import toast from 'react-hot-toast';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CompaniesPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Bulk action states
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'' | 'status' | 'assign'>('');
  const [bulkStatusValue, setBulkStatusValue] = useState('');
  const [bulkAssignValue, setBulkAssignValue] = useState('');

  
  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await syncInboxReplies();
      toast.success(`Inbox synced! Found ${res.count} new replies.`);
      if (res.count > 0) fetchCompanies();
    } catch (err: any) {
      toast.error('Failed to sync: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await getCompanies({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined
      });
      setCompanies(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      const delayDebounceFn = setTimeout(() => {
        fetchCompanies();
      }, search ? 300 : 0); // debounce search
      
      return () => clearTimeout(delayDebounceFn);
    }
  }, [page, search, statusFilter, status, router]);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      getUsers().then(setTeamMembers).catch(console.error);
    }
  }, [status, user?.role]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await importCompanies(formData);
      toast.success(`Import successful: ${res.count} companies imported.`);
      fetchCompanies();
    } catch (error: any) {
      console.error(error);
      toast.error('Import failed: ' + (error.message || 'Unknown error'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCompanyIds(companies.map(c => c.id));
    } else {
      setSelectedCompanyIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedCompanyIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const executeBulkAction = async () => {
    if (!bulkActionType) return;
    if (bulkActionType === 'status' && !bulkStatusValue) return toast.error('Select a status');
    if (bulkActionType === 'assign' && !bulkAssignValue) return toast.error('Select a team member');

    setIsBulkActing(true);
    try {
      if (bulkActionType === 'status') {
        await bulkChangeStatus(selectedCompanyIds, bulkStatusValue);
        toast.success(`Status updated for ${selectedCompanyIds.length} companies`);
      } else if (bulkActionType === 'assign') {
        await bulkAssignCompanies(selectedCompanyIds, bulkAssignValue);
        toast.success(`Assigned ${selectedCompanyIds.length} companies`);
      }
      setSelectedCompanyIds([]);
      setBulkActionType('');
      fetchCompanies();
    } catch (err: any) {
      toast.error('Bulk action failed: ' + err.message);
    } finally {
      setIsBulkActing(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCompany(deleteConfirmId);
      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch {
      toast.error('Failed to delete. Make sure you are an Admin.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={(session?.user as any)?.role === 'ADMIN' ? '/admin' : '/member'} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <span className="font-semibold text-gray-900">SponsorFlow</span>
            </Link>
            
            {(session?.user as any)?.role === 'ADMIN' && (
              <nav className="hidden md:flex gap-6">
                <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Analytics</Link>
                <Link href="/companies" className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 py-5">Directory</Link>
                <Link href="/users" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Users</Link>
              </nav>
            )}
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
        
        {/* Header & Actions */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">Target Directory</h1>
            <p className="mt-2 text-sm text-gray-500">A comprehensive list of all prospective sponsors and partners.</p>
          </div>
          
          <div className="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
            {(session?.user as any)?.role === 'ADMIN' && (
              <>
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                
                <button 
                  onClick={handleSync} 
                  disabled={syncing}
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <svg className="-ml-0.5 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? 'Syncing...' : 'Sync Inbox'}
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={importing}
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <svg className="-ml-0.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2zM3 14.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                  {importing ? 'Importing...' : 'Import CSV'}
                </button>
                <Link 
                  href="/companies/new" 
                  className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                >
                  <svg className="-ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Add Target
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Table & Filters Section */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          
          <div className="px-6 py-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between bg-white">
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="relative rounded-md shadow-sm w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search globally..." 
                  className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select 
                className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="NOT_ASSIGNED">Unassigned</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="EMAIL_DRAFTED">Email Drafted</option>
                <option value="EMAIL_SENT">Email Sent</option>
                <option value="REPLIED">Replied</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </div>
          </div>

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
                  <th scope="col" className="relative px-6 sm:w-12 sm:px-6 border-b border-gray-200">
                    <input
                      type="checkbox"
                      className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedCompanyIds.length > 0 && selectedCompanyIds.length < companies.length;
                        }
                      }}
                      checked={companies.length > 0 && selectedCompanyIds.length === companies.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-3 font-semibold text-gray-900 border-b border-gray-200">Company</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Contact</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Assigned To</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 border-b border-gray-200">Status</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6 border-b border-gray-200">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {companies.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedCompanyIds.includes(c.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="relative px-6 sm:w-12 sm:px-6">
                      {selectedCompanyIds.includes(c.id) && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-indigo-600"></div>
                      )}
                      <input
                        type="checkbox"
                        className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        value={c.id}
                        checked={selectedCompanyIds.includes(c.id)}
                        onChange={() => handleSelectRow(c.id)}
                      />
                    </td>
                    <td className="py-4 pl-3 pr-3 max-w-[200px] sm:max-w-[300px]">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate" title={c.companyName}>{c.companyName}</span>
                        {c.lockedById && c.lockedById !== user?.id && (
                          <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <title>Locked by another user</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        {c.lockedById === user?.id && (
                          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <title>Locked by you</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      {c.industry && <div className="text-gray-500 text-xs mt-0.5">{c.industry}</div>}
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-gray-900">{c.contactPerson || '-'}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{c.email}</div>
                    </td>
                    <td className="px-3 py-4">
                      {c.assignment?.user?.name ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] ring-1 ring-indigo-600/20">
                            {c.assignment.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-900">{c.assignment.user.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[c.status] || STATUS_BADGES['NOT_ASSIGNED']}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-medium">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                        <Link 
                          href={`/companies/${c.id}`} 
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                        >
                          View
                        </Link>
                        {(session?.user as any)?.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDeleteClick(c.id)} 
                            className="text-rose-600 hover:text-rose-900 bg-rose-50 px-3 py-1.5 rounded-md hover:bg-rose-100 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!loading && companies.length === 0 && (
              <div className="text-center py-16 px-6">
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No companies found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search || statusFilter ? 'Try adjusting your search or filters.' : 'Your directory is completely empty. Import a CSV to get started!'}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    {page}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedCompanyIds.length > 0 && user?.role === 'ADMIN' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-gray-900 shadow-2xl rounded-2xl p-2 pl-6 pr-4 flex items-center gap-6 text-white ring-1 ring-white/10">
              <span className="font-medium text-sm whitespace-nowrap">
                {selectedCompanyIds.length} selected
              </span>
              <div className="h-6 w-px bg-gray-700"></div>
              
              <div className="flex items-center gap-2">
                <select 
                  className="bg-gray-800 text-sm text-white rounded-lg border-0 py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  value={bulkActionType}
                  onChange={e => setBulkActionType(e.target.value as any)}
                >
                  <option value="">Choose action...</option>
                  <option value="status">Change Status</option>
                  <option value="assign">Assign To</option>
                </select>

                {bulkActionType === 'status' && (
                  <select 
                    className="bg-gray-800 text-sm text-white rounded-lg border-0 py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={bulkStatusValue}
                    onChange={e => setBulkStatusValue(e.target.value)}
                  >
                    <option value="">Select status...</option>
                    <option value="NOT_ASSIGNED">Unassigned</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="EMAIL_DRAFTED">Email Drafted</option>
                    <option value="EMAIL_SENT">Email Sent</option>
                    <option value="REPLIED">Replied</option>
                    <option value="CONFIRMED">Confirmed</option>
                  </select>
                )}

                {bulkActionType === 'assign' && (
                  <select 
                    className="bg-gray-800 text-sm text-white rounded-lg border-0 py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={bulkAssignValue}
                    onChange={e => setBulkAssignValue(e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {teamMembers.map(tm => (
                      <option key={tm.id} value={tm.id}>{tm.name}</option>
                    ))}
                  </select>
                )}

                {bulkActionType && (
                  <button
                    onClick={executeBulkAction}
                    disabled={isBulkActing}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50 ml-2"
                  >
                    {isBulkActing ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </div>
              
              <div className="h-6 w-px bg-gray-700 ml-2"></div>
              
              <button 
                onClick={() => setSelectedCompanyIds([])}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
                title="Clear selection"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>


      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900/50 transition-opacity backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">Delete Company</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Are you sure you want to delete this target company? This action cannot be undone and will permanently remove all associated data, assignments, and activity history.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button type="button" className="inline-flex w-full justify-center rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 sm:ml-3 sm:w-auto transition-colors" onClick={confirmDelete}>Delete completely</button>
                  <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-colors" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
