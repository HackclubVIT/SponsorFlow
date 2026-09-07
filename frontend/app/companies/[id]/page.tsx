'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from '../../../components/NotificationBell';

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

import { getCompanyById, getTemplates, updateCompanySummary } from '../../../actions/companies';
import { lockCompany, unlockCompany, addNote, scheduleFollowUp, assignCompanyToMember } from '../../../actions/mutations';
import { getUsers } from '../../../actions/users';
import { generatePersonalizedIntro, generateCompanySummary, draftFullEmail } from '../../../actions/ai';
import { sendEmailWithAttachments } from '../../../actions/gmail';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [company, setCompany] = useState<any>({});
  
  const [composer, setComposer] = useState({ subject: '', body: '' });
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [suggestingReplyFor, setSuggestingReplyFor] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState('');

  
  const fetchData = useCallback(async () => {
    
        try {
          const promises: any[] = [
            getCompanyById(params.id as string),
            getTemplates()
          ];
          
          if (user?.role === 'ADMIN') {
            promises.push(getUsers());
          }
          
          const results = await Promise.all(promises);
          
          setCompany(results[0]);
          setSummaryText(results[0]?.aiSummary || '');
          setTemplates(results[1] || []);
          
          if (user?.role === 'ADMIN' && results[2]) {
            setUsers(results[2]);
          }
        } catch (error: any) {
          toast.error('Failed to load data: ' + error.message);
          console.error("Full error:", error);
          router.push('/companies');
        } finally {
          setLoading(false);
        }
      
  }, [params.id, router, user?.role]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);
  

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{{company}}/g, company?.companyName || 'Company')
      .replace(/{{contact}}/g, company?.contactPerson || 'there')
      .replace(/{{event}}/g, 'our upcoming event')
      .replace(/{{member}}/g, user?.name || 'Sponsorship Team')
      .replace(/{{club}}/g, 'Hack Club')
      .replace(/{{website}}/g, company?.website || '');
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposer({
        subject: replacePlaceholders(template.subject),
        body: replacePlaceholders(template.body)
      });
    }
  };

  const handleAssignCompany = async (targetUserId: string | null) => {
    try {
      await assignCompanyToMember(params.id as string, targetUserId);
      const companyData = await getCompanyById(params.id as string);
      setCompany(companyData);
      toast.success('Company assignment updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign company');
    }
  };

  const handleLock = async () => {
    try {
      await lockCompany(params.id as string);
      toast.success('Lock acquired! You can now compose the first email (5 min limit).');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to acquire lock.');
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockCompany(params.id as string);
      toast.success('Lock released.');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to release lock.');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to send this email via your Gmail account?')) return;
    
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('companyId', params.id as string);
      formData.append('subject', composer.subject);
      formData.append('body', composer.body);
      
      if (attachments && attachments.length > 0) {
        Array.from(attachments).forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      await sendEmailWithAttachments(formData);
      toast.success('Email sent successfully!');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateIntro = async () => {
    setGeneratingIntro(true);
    try {
      const res = await generatePersonalizedIntro(params.id as string);
      setComposer(prev => ({
        ...prev,
        body: res.text + '\n\n' + prev.body
      }));

      if (!company?.aiSummary) {
        const updated = await getCompanyById(params.id as string);
        setCompany(updated);
        setSummaryText(updated?.aiSummary || '');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate intro');
    } finally {
      setGeneratingIntro(false);
    }
  };

  const handleDraftEmail = async () => {
    setDraftingEmail(true);
    try {
      const { success, subject, body } = await draftFullEmail(params.id as string);
      
      if (!success) {
        throw new Error('Failed to generate draft');
      }
      
      setComposer({ subject: subject || 'Sponsorship Opportunity', body: body || '' });
      setActiveTab('email');
      
      if (!company?.aiSummary) {
        const updated = await getCompanyById(params.id as string);
        setCompany(updated);
        setSummaryText(updated?.aiSummary || '');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to draft email');
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    try {
      await updateCompanySummary(params.id as string, summaryText);
      setCompany({ ...company, aiSummary: summaryText });
      setIsEditingSummary(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save description');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      await generateCompanySummary(params.id as string);
      const companyData = await getCompanyById(params.id as string);
      setCompany(companyData);
      setSummaryText(companyData?.aiSummary || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    setSubmittingNote(true);
    try {
      await addNote(params.id as string, newNote);
      setNewNote('');
      const companyData = await getCompanyById(params.id as string);
      setCompany(companyData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };


  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;

    setSubmittingFollowUp(true);
    try {
      await scheduleFollowUp(params.id as string, new Date(followUpDate).toISOString(), followUpNote);
      setFollowUpDate('');
      setFollowUpNote('');
      toast.success('Follow-up scheduled successfully!');
      const companyData = await getCompanyById(params.id as string);
      setCompany(companyData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule follow-up');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 pb-12 animate-pulse">
        <header className="bg-white border-b border-gray-200 h-16"></header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex gap-6">
          <div className="w-[400px] space-y-6 shrink-0">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-48 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="h-[600px] bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const showComposer = 
    (company?.lockedById === user?.id && company?.status === 'NOT_ASSIGNED') || 
    (company?.assignment?.userId === user?.id && !['CONFIRMED', 'REJECTED'].includes(company?.status)) ||
    (user?.role === 'ADMIN' && !['CONFIRMED', 'REJECTED'].includes(company?.status));

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={user?.role === 'ADMIN' ? '/admin' : '/member'} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <span className="font-semibold text-gray-900">SponsorFlow</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href={user?.role === 'ADMIN' ? '/companies' : '/member'} 
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 mr-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to {user?.role === 'ADMIN' ? 'Directory' : 'Dashboard'}
            </Link>
            <NotificationBell />
            <div className="h-5 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                <span className="text-xs text-gray-500">{user?.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col md:flex-row gap-8">
        
        {/* LEFT COL: PROFILE DATA */}
        <div className="w-full md:w-[380px] shrink-0 space-y-6">
          
          {/* Identity */}
          <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{company?.companyName}</h1>
            <p className="text-sm text-gray-500 mb-5">{company?.industry || 'Unknown Industry'} • {company?.location || 'Unknown Location'}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset uppercase tracking-wider ${STATUS_BADGES[company?.status || 'NOT_ASSIGNED']}`}>
                {company?.status ? company.status.replace(/_/g, ' ') : 'NOT ASSIGNED'}
              </span>
            </div>

            <dl className="text-sm space-y-4 text-gray-600">
              <div className="flex items-start gap-3">
                <dt className="font-medium text-gray-900 w-20 shrink-0">Contact</dt>
                <dd>{company?.contactPerson || '-'} {company?.designation ? <span className="text-gray-400">({company.designation})</span> : ''}</dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="font-medium text-gray-900 w-20 shrink-0">Email</dt>
                <dd className="truncate">
                  {company?.email ? <a href={`mailto:${company.email}`} className="text-indigo-600 hover:underline">{company.email}</a> : '-'}
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="font-medium text-gray-900 w-20 shrink-0">Phone</dt>
                <dd>{company?.phoneNumber || '-'}</dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="font-medium text-gray-900 w-20 shrink-0">Links</dt>
                <dd className="flex gap-3">
                  {company?.website ? <a href={company.website} target="_blank" className="text-indigo-600 hover:underline">Website</a> : <span className="text-gray-400">No Web</span>}
                  <span className="text-gray-300">|</span>
                  {company?.linkedin ? <a href={company.linkedin} target="_blank" className="text-indigo-600 hover:underline">LinkedIn</a> : <span className="text-gray-400">No LI</span>}
                </dd>
              </div>
            </dl>
          </div>

          {/* Company Description */}
          <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5 relative overflow-hidden border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Context for AI Assistant
              </h3>
              <div className="flex items-center gap-2">
                {!isEditingSummary ? (
                  <button 
                    onClick={() => setIsEditingSummary(true)} 
                    className="text-xs bg-white text-gray-700 px-3 py-1.5 rounded-md font-medium shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {company?.aiSummary ? 'Edit' : 'Add Info'}
                  </button>
                ) : (
                  <button 
                    onClick={handleSaveSummary} 
                    disabled={savingSummary}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {savingSummary ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button 
                  onClick={handleGenerateSummary} 
                  disabled={generatingSummary || isEditingSummary} 
                  className="text-xs bg-white text-gray-700 px-3 py-1.5 rounded-md font-medium shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Generate AI Summary based on industry and website"
                >
                  {generatingSummary ? 'Analyzing...' : 'Auto-Generate'}
                </button>
              </div>
            </div>
            <div className="relative z-10">
              {isEditingSummary ? (
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Paste or type a detailed description of the company, their products, or why they are a great fit for sponsorship to give the AI highly specific context..."
                  rows={4}
                  className="w-full block rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                />
              ) : company?.aiSummary ? (
                <div className="prose prose-sm prose-gray max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {company.aiSummary}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No context provided. Add details or auto-generate to help the AI write better emails.</p>
              )}
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-gray-900/5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Logistics & Access</h3>
            <dl className="text-sm space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Assigned Member</dt>
                <dd className="font-medium text-gray-900">
                  {user?.role === 'ADMIN' ? (
                    <select 
                      value={company?.assignment?.userId || ''} 
                      onChange={(e) => handleAssignCompany(e.target.value || null)}
                      className="block rounded-md border-0 py-1 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    company?.assignment?.user?.name || 'Unassigned'
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  {company?.lockedById ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      Locked for Drafting
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" /></svg>
                      Unlocked
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            
            <div className="mt-5 pt-5 border-t border-gray-100 flex gap-3">
              {!company?.lockedById && company?.status === 'NOT_ASSIGNED' && (
                <button onClick={handleLock} className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-md font-medium text-sm hover:bg-indigo-100 transition-colors ring-1 ring-inset ring-indigo-600/20 shadow-sm">
                  Acquire Lock
                </button>
              )}
              {company?.lockedById === user?.id && company?.status === 'NOT_ASSIGNED' && (
                <button onClick={handleUnlock} className="flex-1 bg-white text-gray-700 py-2 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors ring-1 ring-inset ring-gray-300 shadow-sm">
                  Release Lock
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: WORKSPACE */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* Composer */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h2 className="text-base font-semibold text-gray-900">Outreach Workspace</h2>
              {showComposer && (
                <div className="flex items-center gap-3">
                  <select onChange={handleTemplateSelect} defaultValue="" className="text-sm rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 shadow-sm">
                    <option value="" disabled>Load Template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6">
              {showComposer ? (
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                    <input 
                      required 
                      type="text" 
                      value={composer.subject}
                      onChange={(e) => setComposer({...composer, subject: e.target.value})}
                      className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-medium"
                      placeholder="e.g. Sponsorship Opportunity with Hack Club"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-gray-500">Message</label>
                      <div className="flex items-center gap-4">
                        <button 
                          type="button"
                          onClick={handleDraftEmail}
                          disabled={draftingEmail}
                          className="text-xs text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50 disabled:hover:text-indigo-600 transition-colors flex items-center gap-1"
                          title="Draft a complete email. Auto-generates company profile if missing."
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.92 12.38a1 1 0 00-.22-1.09l-7-7a.996.996 0 10-1.41 1.41l5.3 5.3H4v2h12.59l-5.3 5.3a.996.996 0 000 1.41c.19.2.44.3.7.3s.51-.1.71-.29l7-7c.09-.09.16-.21.21-.33z" /></svg>
                          {draftingEmail ? 'Drafting...' : 'Draft Full Email'}
                        </button>
                        <button 
                          type="button"
                          onClick={handleGenerateIntro}
                          disabled={generatingIntro}
                          className="text-xs text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50 disabled:hover:text-indigo-600 transition-colors flex items-center gap-1"
                          title="Generate a custom intro paragraph. Auto-generates company profile if missing."
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {generatingIntro ? 'Generating...' : 'Magic Intro'}
                        </button>
                      </div>
                    </div>
                    <div className="relative group">
                      {previewMode ? (
                        <div className="w-full h-72 border border-gray-200 rounded-md p-4 text-sm bg-gray-50 overflow-y-auto whitespace-pre-wrap text-gray-800 shadow-inner">
                          {composer.body}
                        </div>
                      ) : (
                        <textarea 
                          required 
                          value={composer.body}
                          onChange={(e) => setComposer({...composer, body: e.target.value})}
                          className="block w-full h-72 rounded-md border-0 py-3 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm resize-y font-mono"
                          placeholder="Write your email here..."
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Attachments (Optional)</label>
                      <input 
                        type="file" 
                        multiple 
                        onChange={(e) => setAttachments(e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-3 border-t border-gray-100">
                    <button 
                      type="button"
                      onClick={() => setPreviewMode(!previewMode)}
                      className="px-4 py-2 bg-white text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 ring-1 ring-inset ring-gray-300 transition-colors shadow-sm"
                    >
                      {previewMode ? 'Edit Mode' : 'Preview Format'}
                    </button>
                    <button 
                      disabled={sending || !company?.email} 
                      type="submit" 
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-md font-medium text-sm hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Sending via Gmail API...
                        </>
                      ) : (
                        `Send Email to ${company?.email || 'Missing Email'}`
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 px-6 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">Workspace Locked</h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                    You cannot compose emails here. Either this target is unassigned, or another member holds the draft lock.
                  </p>
                </div>
              )}
            </div>
          </div>

{/* Bottom Grid: Timelines & Notes - DISTILLED into Tabs */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-col h-[500px]">
            {/* Tab Headers */}
            <div className="px-6 py-0 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex gap-6">
              <button 
                type="button"
                onClick={() => setActiveTab('timeline')} 
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Activity Timeline
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('notes')} 
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Internal Notes
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('followup')} 
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'followup' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Schedule Follow-up
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto relative">
              {activeTab === 'timeline' && (
                <div className="p-6">
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
                    {company?.activities?.length > 0 ? company.activities.map((act: any) => (
                      <div key={act.id} className="relative flex items-start gap-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-indigo-500 text-white shadow shrink-0 z-10 mt-0.5"></div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wide">{act.type.replace(/_/g, ' ')}</h4>
                            <span className="text-[10px] text-gray-400 font-medium">{new Date(act.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{act.description}</p>
                          {act.user && <p className="text-[10px] text-indigo-600 mt-1.5 font-medium">By {act.user.name}</p>}
                        </div>
                      </div>
                    )) : (
                      <div className="relative flex items-start gap-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-gray-300 shrink-0 z-10 mt-0.5"></div>
                        <div className="flex-1 pb-1">
                          <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Target Created</h4>
                          <span className="text-[10px] text-gray-400 font-medium block mt-1">{new Date(company?.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                    {company?.notes?.length > 0 ? company.notes.map((note: any) => (
                      <div key={note.id} className="bg-amber-50/50 p-3 rounded-md ring-1 ring-inset ring-amber-500/20">
                        <p className="text-xs text-gray-800 leading-relaxed">{note.content}</p>
                        <p className="text-[10px] text-amber-700 mt-2 font-medium">{note.author?.name} • {new Date(note.createdAt).toLocaleDateString()}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400 italic text-center mt-6">No notes added.</p>
                    )}
                  </div>
                  <form onSubmit={handleAddNote} className="p-3 border-t border-gray-100 bg-gray-50">
                    <input 
                      type="text" 
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Type a note and press Enter..."
                      className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                      disabled={submittingNote}
                    />
                  </form>
                </div>
              )}

              {activeTab === 'followup' && (
                <form onSubmit={handleScheduleFollowUp} className="p-6 flex flex-col h-full max-w-md mx-auto justify-center">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alert Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={followUpDate}
                        onChange={e => setFollowUpDate(e.target.value)}
                        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        required
                        disabled={submittingFollowUp}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Note</label>
                      <input 
                        type="text" 
                        value={followUpNote}
                        onChange={e => setFollowUpNote(e.target.value)}
                        placeholder="Check if they reviewed the deck..."
                        className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                        disabled={submittingFollowUp}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={submittingFollowUp || !followUpDate}
                      className="mt-6 w-full bg-indigo-600 text-white py-2.5 rounded-md font-medium text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Set Reminder
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
