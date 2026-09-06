flowchart TD

subgraph group_ui["Next.js UI"]
  node_next{{"Next.js App Router<br/>runtime<br/>[package.json]"}}
  node_shell["Layout &amp; providers<br/>UI shell<br/>[layout.tsx]"]
  node_dashboard["Dashboard landing<br/>page<br/>[page.tsx]"]
  node_companies["Company list<br/>page<br/>[page.tsx]"]
  node_company_detail["Company detail<br/>page<br/>[page.tsx]"]
  node_templates["Template admin<br/>page<br/>[page.tsx]"]
  node_login["Login<br/>page<br/>[page.tsx]"]
end

subgraph group_server["Server boundary"]
  node_proxy["Request access policy<br/>proxy<br/>[proxy.ts]"]
  node_auth["NextAuth handler<br/>auth route<br/>[route.ts]"]
  node_company_actions["Company actions<br/>server actions<br/>[companies.ts]"]
  node_gmail_actions["Gmail actions<br/>server actions<br/>[gmail.ts]"]
  node_ai_actions["AI actions<br/>server actions<br/>[ai.ts]"]
end

subgraph group_data["Persistence"]
  node_prisma_client["Prisma client<br/>data access<br/>[prisma.ts]"]
  node_prisma_schema["CRM data model<br/>Prisma schema<br/>[schema.prisma]"]
  node_postgres[("PostgreSQL<br/>database<br/>[database.md]")]
end

node_google["Google OAuth<br/>external identity"]
node_gmail["Gmail<br/>external service"]
node_ai_provider["AI provider<br/>external service"]

node_next -->|"renders"| node_shell
node_shell -->|"wraps"| node_dashboard
node_shell -->|"wraps"| node_companies
node_shell -->|"wraps"| node_company_detail
node_shell -->|"wraps"| node_templates
node_proxy -->|"guards requests"| node_next
node_login -->|"signs in through"| node_auth
node_auth -->|"uses OAuth"| node_google
node_companies -->|"manages companies"| node_company_actions
node_company_detail -->|"reads and mutates"| node_company_actions
node_templates -.->|"uses server operations"| node_company_actions
node_company_actions -->|"persists via"| node_prisma_client
node_gmail_actions -->|"reads CRM data"| node_prisma_client
node_ai_actions -->|"reads CRM data"| node_prisma_client
node_gmail_actions -->|"integrates with"| node_gmail
node_ai_actions -->|"invokes"| node_ai_provider
node_prisma_client -->|"implements"| node_prisma_schema
node_prisma_client -->|"connects to"| node_postgres

click node_next "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/package.json"
click node_shell "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/layout.tsx"
click node_dashboard "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/page.tsx"
click node_companies "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/companies/page.tsx"
click node_company_detail "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/companies/%5Bid%5D/page.tsx"
click node_templates "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/admin/templates/page.tsx"
click node_login "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/login/page.tsx"
click node_proxy "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/proxy.ts"
click node_auth "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/app/api/auth/%5B...nextauth%5D/route.ts"
click node_company_actions "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/actions/companies.ts"
click node_gmail_actions "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/actions/gmail.ts"
click node_ai_actions "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/actions/ai.ts"
click node_prisma_client "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/lib/prisma.ts"
click node_prisma_schema "https://github.com/noobplayer77777/sponsorflow/blob/main/frontend/prisma/schema.prisma"
click node_postgres "https://github.com/noobplayer77777/sponsorflow/blob/main/docs/database.md"

classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneMint fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
classDef toneIndigo fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81
classDef toneTeal fill:#ccfbf1,stroke:#0f766e,stroke-width:1.5px,color:#134e4a
class node_next,node_shell,node_dashboard,node_companies,node_company_detail,node_templates,node_login toneBlue
class node_proxy,node_auth,node_company_actions,node_gmail_actions,node_ai_actions toneAmber
class node_prisma_client,node_prisma_schema,node_postgres toneMint
class node_google,node_gmail,node_ai_provider toneNeutral
