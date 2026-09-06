const fs = require('fs');
let code = fs.readFileSync('frontend/app/companies/page.tsx', 'utf8');
code = code.replace(
  /<td className="py-4 pl-6 pr-3">\s*<div className="font-medium text-gray-900 flex items-center gap-2">\s*\{c\.companyName\}/,
  `<td className="py-4 pl-6 pr-3 max-w-[200px] sm:max-w-[300px]">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate" title={c.companyName}>{c.companyName}</span>`
);
fs.writeFileSync('frontend/app/companies/page.tsx', code, 'utf8');
console.log('Truncation added');
