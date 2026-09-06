const fs = require('fs');
let code = fs.readFileSync('frontend/app/companies/[id]/page.tsx', 'utf8');

const startString = '{/* Company Description */}';
const start = code.indexOf(startString);
const endString = '{/* Logistics */}';
const end = code.indexOf(endString, start);

if (start !== -1 && end !== -1) {
  const replacement = `{/* Company Description */}
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
          </div>\n\n          `;
  
  code = code.substring(0, start) + replacement + code.substring(end);
  fs.writeFileSync('frontend/app/companies/[id]/page.tsx', code, 'utf8');
  console.log('Company description polished');
} else {
  console.log('Could not find start or end block');
}
