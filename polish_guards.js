const fs = require('fs');
let code = fs.readFileSync('frontend/app/companies/[id]/page.tsx', 'utf8');

const oldTemplate = `const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposer({
        subject: replacePlaceholders(template.subject),
        body: replacePlaceholders(template.body)
      });
    }
  };`;

const newTemplate = `const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    if (composer.body.trim() && !window.confirm('This will overwrite your current draft. Continue?')) {
      e.target.value = ''; // Reset select
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposer({
        subject: replacePlaceholders(template.subject),
        body: replacePlaceholders(template.body)
      });
    }
    e.target.value = ''; // Reset select after loading
  };`;

code = code.replace(oldTemplate, newTemplate);

const oldDraft = `const handleDraftEmail = async () => {
    setDraftingEmail(true);`;

const newDraft = `const handleDraftEmail = async () => {
    if (composer.body.trim() && !window.confirm('This will overwrite your current draft with an AI generated email. Continue?')) return;
    setDraftingEmail(true);`;

code = code.replace(oldDraft, newDraft);

fs.writeFileSync('frontend/app/companies/[id]/page.tsx', code, 'utf8');
console.log('Confirmation guards added');
