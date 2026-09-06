# SponsorFlow

SponsorFlow is an internal sponsorship CRM for the HackClub Finance Team, designed to streamline and organize sponsorship outreach.

## Project Architecture
This project follows a decoupled client-server architecture:
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
## Project Structure 
<img width="4658" height="4879" alt="diagram" src="https://github.com/user-attachments/assets/4e164740-7b9b-4e5f-af7c-913582055521" />

## Folder Structure
```
SponsorFlow/
├── frontend/   # Next.js frontend application
├── backend/    # Express.js backend application
├── prisma/     # Database schema and migrations
├── docs/       # Architecture and technical documentation
```

## Tech Stack
- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma
- Auth (Future): Google OAuth
- Email (Future): Gmail API
- Queues (Future): Redis, BullMQ

## Installation & Setup

### Google Cloud OAuth Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "SponsorFlow").
3. Navigate to **APIs & Services** > **OAuth consent screen** and configure it for "External" or "Internal" depending on your Google Workspace.
4. Navigate to **Credentials** and click **Create Credentials** > **OAuth client ID**.
5. Select **Web application**.
6. Under **Authorized JavaScript origins**, add `http://localhost:3000`.
7. Under **Authorized redirect URIs**, add `http://localhost:3000`.
8. Copy your **Client ID** and **Client Secret**. Add them to your `.env` file under `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your local values. Include your newly created Google Client ID and generate a random `JWT_SECRET`.
   ```bash
   cp .env.example .env
   ```

3. **Database setup**:
   Make sure you have a local PostgreSQL instance running.
   ```bash
   npm run db:push
   npm run db:generate
   ```

## Running the Application

- **Run frontend only**:
  ```bash
  npm run dev:frontend
  ```

- **Run backend only**:
  ```bash
  npm run dev:backend
  ```

- **Run both concurrently**:
  ```bash
  npm run dev
  ```

- **Run Prisma Studio** (Database GUI):
  ```bash
  npm run db:studio
  ```

## Git Workflow
We use a feature-branch workflow.
1. `main` - stable production code.
2. `develop` - active development, integration branch.
3. Feature branches - branched off from `develop`.

**Example feature branches:**
- `feature/auth`
- `feature/company-management`

**Rules:**
- Do NOT directly push feature work to `main` or `develop`.
- Always open a Pull Request against `develop`.
