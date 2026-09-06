'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from '../../components/NotificationBell';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

import { getDashboardStats } from '../../actions/analytics';
import { useSession, signOut } from 'next-auth/react';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    industry: '',
    status: ''
  });

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchStats = async () => {
        try {
          setLoading(true);
          const data = await getDashboardStats(filters);
          setStats(data);
        } catch (err: any) {
          setError(err.message || 'Failed to load analytics');
        } finally {
          setLoading(false);
        }
      };
      
      fetchStats();
    }
  }, [filters, session, status, router]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <span className="font-semibold text-gray-900">SponsorFlow Admin</span>
            </div>
            
            <nav className="hidden md:flex gap-6">
              <Link href="/admin" className="text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 py-5">Analytics</Link>
              <Link href="/companies" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Directory</Link>
              <Link href="/users" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-5 transition-colors">Users</Link>
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
        
        {/* Header & Global Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organization Performance</h1>
            <p className="mt-1 text-sm text-gray-500">Track high-level metrics across all members and industries.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg ring-1 ring-gray-900/5 shadow-sm">
            <div className="flex items-center">
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="block w-36 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" title="Start Date" />
              <span className="mx-2 text-gray-400 text-sm">to</span>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="block w-36 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" title="End Date" />
            </div>
            <div className="h-5 w-px bg-gray-200 hidden md:block"></div>
            <input type="text" name="industry" placeholder="Industry..." value={filters.industry} onChange={handleFilterChange} className="block w-32 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
            <select name="status" value={filters.status} onChange={handleFilterChange} className="block w-32 rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white">
              <option value="">All Status</option>
              <option value="NOT_ASSIGNED">Unassigned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EMAIL_SENT">Emailed</option>
              <option value="REPLIED">Replied</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
            {(filters.startDate || filters.endDate || filters.industry || filters.status) && (
              <button onClick={() => setFilters({startDate: '', endDate: '', industry: '', status: ''})} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="Clear Filters">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 ring-1 ring-inset ring-red-600/20">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
                <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* TOP CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative overflow-hidden bg-white px-5 py-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
                <dt className="truncate text-sm font-medium text-gray-500 mb-1">Total Companies</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-gray-900">{stats.totalCompanies.toLocaleString()}</span>
                </dd>
                <p className="mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 inline-flex px-2 py-0.5 rounded-full ring-1 ring-inset ring-indigo-600/20">
                  {stats.assignedCompanies.toLocaleString()} Assigned
                </p>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-100"><div className="h-full w-full bg-indigo-500 ring-1 ring-inset ring-indigo-600/20"></div></div>
              </div>

              <div className="relative overflow-hidden bg-white px-5 py-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
                <dt className="truncate text-sm font-medium text-gray-500 mb-1">Emails Sent</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-gray-900">{stats.emailsSent.toLocaleString()}</span>
                </dd>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-blue-100"><div className="h-full w-full bg-blue-500 ring-1 ring-inset ring-blue-600/20"></div></div>
              </div>

              <div className="relative overflow-hidden bg-white px-5 py-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
                <dt className="truncate text-sm font-medium text-gray-500 mb-1">Replies</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-gray-900">{stats.replies.toLocaleString()}</span>
                </dd>
                <p className="mt-1 text-xs font-medium text-emerald-700 bg-emerald-50 inline-flex px-2 py-0.5 rounded-full ring-1 ring-inset ring-emerald-600/20">
                  {stats.replyRate} Reply Rate
                </p>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-100"><div className="h-full w-full bg-emerald-500 ring-1 ring-inset ring-emerald-600/20"></div></div>
              </div>

              <div className="relative overflow-hidden bg-white px-5 py-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md">
                <dt className="truncate text-sm font-medium text-gray-500 mb-1">Sponsors Confirmed</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-gray-900">{stats.sponsorsConfirmed.toLocaleString()}</span>
                </dd>
                <p className="mt-1 text-xs font-medium text-green-700 bg-green-50 inline-flex px-2 py-0.5 rounded-full ring-1 ring-inset ring-green-600/20">
                  ${stats.totalSponsorshipRaised.toLocaleString()} Raised
                </p>
                <div className="absolute bottom-0 left-0 h-1 w-full bg-green-100"><div className="h-full w-full bg-green-500 ring-1 ring-inset ring-green-600/20"></div></div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Member Performance Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
                <h3 className="text-base font-semibold text-gray-900 mb-6">Member Activity (Sent vs Confirmed)</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.memberPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                      <RechartsTooltip 
                        cursor={{fill: '#f3f4f6'}} 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                      <Bar dataKey="emailsSent" name="Emails Sent" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="confirmed" name="Confirmed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Industry Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
                <h3 className="text-base font-semibold text-gray-900 mb-6">Pipeline by Industry</h3>
                <div className="h-72 w-full flex items-center justify-center">
                  {stats.industryStats.filter((i: any) => i.total > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.industryStats.filter((i: any) => i.total > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="total"
                          nameKey="industry"
                        >
                          {stats.industryStats.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          formatter={(value: any, name: any) => [`${value} Companies`, name]}
                        />
                        <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-sm text-gray-500">No industry data available for these filters.</div>
                  )}
                </div>
              </div>
            </div>

            {/* MEMBER TABLE */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Leaderboard</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold text-gray-900">Member Name</th>
                      <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Assigned</th>
                      <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Emails Sent</th>
                      <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900">Confirmed Sponsors</th>
                      <th scope="col" className="px-3 py-3.5 font-semibold text-gray-900 text-right">Amount Raised</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats.memberPerformance.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-6 pr-3 font-medium text-gray-900 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-1 ring-indigo-600/20">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          {member.name}
                        </td>
                        <td className="px-3 py-4 text-gray-600">{member.assigned}</td>
                        <td className="px-3 py-4 text-gray-600">{member.emailsSent}</td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {member.confirmed}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-medium text-gray-900">
                          ${member.raised.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {stats.memberPerformance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No member performance data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          
            {/* RECENT REPLIES */}
            <div className="mt-6 bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
              <h3 className="text-base font-semibold text-gray-900 mb-6">Recent Sponsor Replies (Across All Users)</h3>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Received By (Member)</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sponsor Company</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats?.recentReplies?.length > 0 ? stats.recentReplies.map((reply: any) => (
                      <tr key={reply.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {reply.email?.sender?.name || 'Unknown User'} 
                          <span className="block text-xs text-gray-500 font-normal">{reply.email?.sender?.email}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                            {reply.company?.companyName || 'Unknown Company'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(reply.createdAt).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Link href={`/companies/${reply.companyId}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                            View Thread &rarr;
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                          No replies found in the selected timeframe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
