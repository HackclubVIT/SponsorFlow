# SponsorFlow

SponsorFlow is an internal sponsorship CRM originally built for the HackClub Finance Team, designed to streamline and organize sponsorship outreach. It prevents duplicate outreach, generates AI-powered personalized emails, and allows members to send emails directly from their Gmail accounts.

## Features

- **Centralized Directory**: Manage a directory of target companies and their statuses (Assigned, Email Sent, Interested, Negotiating, etc.).
- **Collision Prevention (Locking)**: Users can "lock" a company (Assign to themselves) to ensure two team members don't accidentally reach out to the same sponsor simultaneously.
- **AI-Powered Outreach**: Integrates with Google Gemini to auto-generate company context based on their industry/website, and draft "Magic Intros" or complete personalized emails using predefined templates.
- **Gmail API Integration**: Send outreach emails (including PDF attachments) directly from the dashboard using the user's authenticated Google account.
- **Progressive Workspace**: Clean tabbed interface for Activity Timelines, Internal Notes, and Follow-up reminders, eliminating UI clutter.
- **Role-Based Access Control**: Strict `ADMIN` and `MEMBER` roles (managed via the database) to restrict who can see all user activities vs just their own assignments.

## Tech Stack

The project has been migrated to a unified **Next.js App Router** architecture (located in the `frontend/` directory).

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Database**: [Lakebase Postgres (Neon)](https://neon.tech/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google OAuth provider)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **AI**: [Google Generative AI](https://aistudio.google.com/) (Gemini)
- **Notifications**: `react-hot-toast` for smooth, non-blocking UI feedback

## Project Structure

```
SponsorFlow/
├── frontend/               # The unified Next.js application
│   ├── app/                # Next.js App Router pages (login, companies, etc.)
│   ├── actions/            # Next.js Server Actions (db mutations, AI, Gmail)
│   ├── components/         # Reusable React components
│   ├── lib/                # API and Prisma client utilities
│   ├── prisma/             # Database schema and migrations
│   └── public/             # Static assets
└── backend/                # (Deprecated) Legacy Express.js backend
```
<img width="4658" height="4879" alt="diagram" src="https://github.com/user-attachments/assets/d4ae1862-4994-4745-8426-075da5022993" />


## Prerequisites

To run this project locally, you will need:
1. **Node.js** (v20+ recommended)
2. **Neon Postgres Database**: A connection string (`DATABASE_URL`).
3. **Google Cloud Console Credentials**: For Google OAuth and Gmail API access.
4. **Gemini API Key**: For the AI drafting features.

## Getting Started

### 1. Google Cloud Setup
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Gmail API**.
3. Configure the **OAuth consent screen** (Internal or External).
4. Create **OAuth 2.0 Client IDs** (Web application).
   - Add `http://localhost:3000` to Authorized JavaScript origins.
   - Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs.
5. Save the Client ID and Client Secret.

### 2. Environment Variables
Navigate to the `frontend/` directory and create a `.env.local` file:

```bash
cd frontend
cp .env.example .env.local
```

Populate the file with your keys:
```env
# Database
DATABASE_URL="postgresql://user:password@ep-w-s-neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_a_random_32_character_string_here"

# Google OAuth & Gmail
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# AI Configuration
GEMINI_API_KEY="your_gemini_api_key"
```

### 3. Installation & Database Setup
Install the dependencies inside the `frontend/` directory:

```bash
npm install
```

Push the Prisma schema to your Neon database and generate the Prisma Client:

```bash
npx prisma db push
npx prisma generate
```

### 4. Running the Application
Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Log in with Google to create your user account. 
*(Note: To access Admin features, you will need to manually change your user's role to `ADMIN` in the database).*

## Architecture Notes
- All database operations, AI processing, and email sending are handled securely on the server using **Next.js Server Actions** (found in the `frontend/actions/` directory).
- The previous Express backend is no longer used, simplifying deployment to a single Vercel or Netlify project.
