const fs = require('fs');
let code = fs.readFileSync('frontend/app/companies/[id]/page.tsx', 'utf8');

if (!code.includes('const [activeTab, setActiveTab]')) {
  code = code.replace(
    /const \[newNote, setNewNote\] = useState\(''\);/,
    "const [activeTab, setActiveTab] = useState('timeline');\n  const [newNote, setNewNote] = useState('');"
  );
}

const replacement = `{/* Bottom Grid: Timelines & Notes - DISTILLED into Tabs */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-col h-[500px]">
            {/* Tab Headers */}
            <div className="px-6 py-0 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex gap-6">
              <button 
                type="button"
                onClick={() => setActiveTab('timeline')} 
                className={\`py-4 text-sm font-semibold border-b-2 transition-colors \${activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
              >
                Activity Timeline
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('notes')} 
                className={\`py-4 text-sm font-semibold border-b-2 transition-colors \${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
              >
                Internal Notes
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('followup')} 
                className={\`py-4 text-sm font-semibold border-b-2 transition-colors \${activeTab === 'followup' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
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
          </div>`;

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* Bottom Grid: Timelines & Notes */}'));

if (startIdx !== -1) {
  let open = 0;
  let endIdx = -1;
  // Start from the div that defines the grid
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<div')) open += (line.match(/<div/g) || []).length;
    if (line.includes('</div')) open -= (line.match(/<\/div/g) || []).length;
    if (open === 0 && line.includes('</div')) {
      endIdx = i;
      break;
    }
  }

  if (endIdx !== -1) {
    const newLines = [
      ...lines.slice(0, startIdx),
      replacement,
      ...lines.slice(endIdx + 1)
    ];
    fs.writeFileSync('frontend/app/companies/[id]/page.tsx', newLines.join('\n'), 'utf8');
    console.log('Distillation applied successfully!');
  } else {
    console.log('End index not found');
  }
} else {
  console.log('Start index not found');
}
