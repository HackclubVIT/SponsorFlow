'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { NotificationBell } from '../../components/NotificationBell';

const STAT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-600/20' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-600/20' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-600/20' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20' },
  red: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-600/20' },
};

const STATUS_BADGES: Record<string, string> = {
  'ASSIGNED': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
  'EMAIL_DRAFTED': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/10',
  'EMAIL_SENT': 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10',
  'OPENED': 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-700/10',
  'REPLIED': 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10',
  'INTERESTED': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/10',
  'NEGOTIATING': 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-800/10',
  'CONFIRMED': 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  'REJECTED': 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-700/10',
};

import { getCompanies } from '../../actions/companies';
import { syncInboxReplies } from '../../actions/gmail';
import toast from 'react-hot-toast';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MemberDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [gmailStatus, setGmailStatus] = useState<any>({ connected: true, email: session?.user?.email });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          const compData = await getCompanies({ limit: 1000 });
          
          const myCompanies = compData.data.filter((c: any) => 
            c.assignment?.userId === (session.user as any).id
          );
          setCompanies(myCompanies);
        } catch (error) {
          console.error("Failed to load dashboard", error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [session, status, router]);

  
  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await syncInboxReplies();
      toast.success(`Inbox synced! Found ${res.count} new replies.`);
      
      // refresh companies
      const compData = await getCompanies({ limit: 1000 });
      const myCompanies = compData.data.filter((c: any) => 
        c.assignment?.userId === (session?.user as any)?.id
      );
      setCompanies(myCompanies);
    } catch (err: any) {
      toast.error('Failed to sync: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const myAssigned = companies.filter(c => c.assignment?.userId === (session?.user as any)?.id);
  
  const metrics = useMemo(() => {
    return [
      { label: 'Assigned Companies', value: myAssigned.length, color: 'blue' },
      { label: 'Pending Outreach', value: myAssigned.filter(c => c.status === 'ASSIGNED' || c.status === 'EMAIL_DRAFTED').length, color: 'orange' },
      { label: 'Emails Sent', value: myAssigned.filter(c => c.status === 'EMAIL_SENT').length, color: 'purple' },
      { label: 'Replies', value: myAssigned.filter(c => c.status === 'REPLIED').length, color: 'cyan' },
      { label: 'Interested', value: myAssigned.filter(c => c.status === 'INTERESTED' || c.status === 'NEGOTIATING').length, color: 'green' },
      { label: 'Follow-ups Due', value: myAssigned.filter(c => c.followUpDate && new Date(c.followUpDate) <= new Date()).length, color: 'red' },
    ];
  }, [myAssigned]);

  const filteredCompanies = myAssigned.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) || 
                          (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>)}
        </div>
        <div className="h-96 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <span className="font-semibold text-gray-900">SponsorFlow</span>
          </div>
          
          <div className="flex items-center gap-6">
            {gmailStatus?.connected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md ring-1 ring-inset ring-emerald-600/20 text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                {gmailStatus.email}
              </div>
            ) : (
              <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors">
                Connect Gmail
              </button>
            )}
            
            {gmailStatus?.connected && (
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? 'Syncing...' : 'Sync Inbox'}
              </button>
            )}

            <div className="h-5 w-px bg-gray-200"></div>
            <NotificationBell />
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{session?.user?.name}</span>
                <span className="text-xs text-gray-500">Member</span>
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
        {/* Header Section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Track your outreach progress and assigned targets.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((stat, i) => {
            const colors = STAT_COLORS[stat.color];
            return (
              <div key={i} className="relative overflow-hidden bg-white px-4 py-5 rounded-xl shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
                <dt className="truncate text-sm font-medium text-gray-500 mb-1">{stat.label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold tracking-tight text-gray-900`}>{stat.value}</span>
                </dd>
                <div className={`absolute bottom-0 left-0 h-1 w-full ${colors.bg}`}>
                  <div className={`h-full w-full ${colors.bg} ring-1 ring-inset ${colors.ring}`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          {/* Table Header / Filters */}
          <div className="px-6 py-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold leading-6 text-gray-900">Assigned Companies</h2>
            
            <div className="mt-3 sm:ml-4 sm:mt-0 flex gap-3">
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search targets..." 
                  className="block w-full rounded-md border-0 py-1.5 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select 
                className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="EMAIL_DRAFTED">Email Drafted</option>
                <option value="EMAIL_SENT">Email Sent</option>
                <option value="OPENED">Opened</option>
                <option value="REPLIED">Replied</option>
                <option value="INTERESTED">Interested</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold text-gray-900">Company</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Contact</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Status</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Last Activity</th>
                  <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Follow-up</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredCompanies.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 pl-6 pr-3">
                      <div className="font-medium text-gray-900">{c.companyName}</div>
                      {c.industry && <div className="text-gray-500 text-xs mt-0.5">{c.industry}</div>}
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-gray-900">{c.contactPerson || '-'}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{c.email}</div>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGES[c.status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10'}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-500">
                      {new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-4">
                      {c.followUpDate ? (
                        <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(c.followUpDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-medium">
                      <Link 
                        href={`/companies/${c.id}`} 
                        className="text-indigo-600 hover:text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 bg-indigo-50 px-3 py-1.5 rounded-md"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Empty State */}
            {filteredCompanies.length === 0 && (
              <div className="text-center py-16 px-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No targets found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {search || statusFilter ? 'Try adjusting your search or filters.' : 'You haven\'t assigned any companies to yourself yet.'}
                </p>
                {!(search || statusFilter) && (
                  <div className="mt-6">
                    <Link
                      href="/companies"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      Browse Available Companies
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
