const fs = require('fs');
let code = fs.readFileSync('frontend/app/companies/[id]/page.tsx', 'utf8');

// 1. Add toast import
if (!code.includes('react-hot-toast')) {
  code = code.replace(
    /import \{ useSession, signOut \} from 'next-auth\/react';/,
    `import { useSession, signOut } from 'next-auth/react';\nimport toast from 'react-hot-toast';`
  );
}

// 2. Add useCallback
code = code.replace(/import \{ useState, useEffect, useRef \} from 'react';/, "import { useState, useEffect, useRef, useCallback } from 'react';");

// 3. Extract fetch data logic to a useCallback function
const fetchPattern = /useEffect\(\(\) => \{[\s\S]*?const fetchCompanyAndTemplates = async \(\) => \{([\s\S]*?)\};\s+fetchCompanyAndTemplates\(\);[\s\S]*?\}, \[params\.id, router, status\]\);/;
const fetchMatch = code.match(fetchPattern);
if (fetchMatch) {
  const fetchBody = fetchMatch[1];
  
  const fetchDataDefinition = `
  const fetchData = useCallback(async () => {
    ${fetchBody}
  }, [params.id, router, user?.role]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);
  `;
  
  code = code.replace(fetchPattern, fetchDataDefinition);
}

// 4. Replace alerts with toasts
code = code.replace(/alert\('Failed to load data: ' \+ error\.message\);/g, "toast.error('Failed to load data: ' + error.message);");
code = code.replace(/alert\('Company assignment updated successfully!'\);/g, "toast.success('Company assignment updated successfully!');");
code = code.replace(/alert\(error\.message \|\| 'Failed to assign company'\);/g, "toast.error(error.message || 'Failed to assign company');");
code = code.replace(/alert\('Lock acquired! You can now compose the first email \(5 min limit\)\.'\);/g, "toast.success('Lock acquired! You can now compose the first email (5 min limit).');");
code = code.replace(/alert\(error\.message \|\| 'Failed to acquire lock\.'\);/g, "toast.error(error.message || 'Failed to acquire lock.');");
code = code.replace(/alert\('Lock released\.'\);/g, "toast.success('Lock released.');");
code = code.replace(/alert\(error\.message \|\| 'Failed to release lock\.'\);/g, "toast.error(error.message || 'Failed to release lock.');");
code = code.replace(/alert\('Email sent successfully!'\);/g, "toast.success('Email sent successfully!');");
code = code.replace(/alert\(error\.message \|\| 'Failed to send email'\);/g, "toast.error(error.message || 'Failed to send email');");
code = code.replace(/alert\(error\.message \|\| 'Failed to generate intro'\);/g, "toast.error(error.message || 'Failed to generate intro');");
code = code.replace(/alert\(error\.message \|\| 'Failed to draft email'\);/g, "toast.error(error.message || 'Failed to draft email');");
code = code.replace(/alert\(error\.message \|\| 'Failed to save description'\);/g, "toast.error(error.message || 'Failed to save description');");
code = code.replace(/alert\(error\.message \|\| 'Failed to generate summary'\);/g, "toast.error(error.message || 'Failed to generate summary');");
code = code.replace(/alert\(error\.message \|\| 'Failed to add note'\);/g, "toast.error(error.message || 'Failed to add note');");
code = code.replace(/alert\(error\.message \|\| 'Failed to generate suggestion'\);/g, "toast.error(error.message || 'Failed to generate suggestion');");
code = code.replace(/alert\('Follow-up scheduled successfully!'\);/g, "toast.success('Follow-up scheduled successfully!');");
code = code.replace(/alert\(error\.message \|\| 'Failed to schedule follow-up'\);/g, "toast.error(error.message || 'Failed to schedule follow-up');");

// 5. Replace window.location.reload() with fetchData()
code = code.replace(/window\.location\.reload\(\);/g, "await fetchData();");

fs.writeFileSync('frontend/app/companies/[id]/page.tsx', code, 'utf8');
console.log('Script done.');
