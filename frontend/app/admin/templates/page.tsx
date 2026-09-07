'use client';
import { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../../actions/templates';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', subject: '', body: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTemplate(editingId, form);
        toast.success('Template updated');
      } else {
        await createTemplate(form);
        toast.success('Template created');
      }
      setForm({ name: '', subject: '', body: '' });
      setEditingId(null);
      fetchTemplates();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject, body: t.body });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto flex gap-8">
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <Link href="/admin" className="text-blue-600 hover:underline">← Admin Dashboard</Link>
          <h1 className="text-2xl font-bold">Email Templates</h1>
        </div>

        <div className="space-y-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white p-4 rounded shadow border">
              <h3 className="font-bold text-lg">{t.name}</h3>
              <p className="text-sm text-gray-500 mb-2">Subject: {t.subject}</p>
              <pre className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap font-sans text-gray-700 h-24 overflow-y-auto mb-4 border">
                {t.body}
              </pre>
              <div className="flex gap-2 text-sm">
                <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-gray-500">No templates found.</p>}
        </div>
      </div>

      <div className="w-96 bg-gray-50 p-6 rounded-lg border h-fit sticky top-8">
        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Template' : 'New Template'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input required type="text" className="w-full border p-2 rounded" 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="e.g. Hackathon Sponsorship" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Subject</label>
            <input required type="text" className="w-full border p-2 rounded" 
              value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Body (HTML/Text)</label>
            <textarea required rows={10} className="w-full border p-2 rounded" 
              value={form.body} onChange={e => setForm({...form, body: e.target.value})} />
            <p className="text-xs text-gray-500 mt-1">
              Placeholders: {'{{company}}, {{contact}}, {{event}}, {{member}}, {{club}}, {{website}}'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
              Save
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', subject: '', body: '' }); }} className="bg-gray-300 px-4 py-2 rounded">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
