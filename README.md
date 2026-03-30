# 🛡️ Code Shield — AI-Based Code Reviewer

> An intelligent, full-stack web platform for AI-powered code analysis, debugging, and real-time execution — built for developers who want instant, actionable feedback on their code.

---

## 📌 Overview

**Code Shield** is a full-stack web application that lets developers write, upload, analyze, and execute code directly in the browser. It integrates large language models (via OpenRouter/OpenAI) for code review and debugging, and uses Judge0 for real-time multi-language code execution — all inside a Monaco-powered editor.

The platform also includes a separate **Admin Dashboard** for monitoring live users, tracking activity, and viewing error reports via Sentry.

---

## ✨ Features

### 👨‍💻 Developer Features
- **Monaco Editor** — Professional VS Code-like code editing experience
- **AI Code Review** — Get explanations, suggestions, and best practices from an LLM
- **AI Debugging** — Paste broken code and get targeted fix suggestions
- **Code Execution** — Run code in 10+ languages with stdin support via Judge0
- **Project Management** — Upload, save, rename, and reload code projects
- **Language Detection** — Automatically detects code language on upload
- **In-Editor Search** — Search within the active file
- **Google & GitHub Login** — Secure OAuth authentication via NextAuth.js

### 🔐 Admin Features
- **Admin Dashboard** — Protected route with admin-only Google OAuth
- **User Monitoring** — View registered users pulled from Google Sheets
- **Live User Count** — Real-time online user tracking via Pusher
- **Error Monitoring** — Integrated Sentry dashboard link for production errors

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + MUI |
| **Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Authentication** | NextAuth.js v4 (Google, GitHub OAuth) |
| **Database** | PostgreSQL via Neon (serverless) |
| **ORM** | Drizzle ORM |
| **File Storage** | Vercel Blob |
| **AI / LLM** | OpenRouter SDK + OpenAI SDK |
| **Code Execution** | Judge0 API |
| **Real-time** | Pusher (presence channels) |
| **Error Tracking** | Sentry |
| **Deployment** | Vercel |

---

## 🗂️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── analyze-code/       # AI code analysis endpoint
│   │   ├── run-code/           # Judge0 execution endpoint
│   │   ├── save-project/       # Save project to DB + Blob
│   │   ├── get-projects/       # Fetch all projects
│   │   ├── get-project-details/# Fetch single project + blob content
│   │   ├── get-users/          # Admin: fetch users from Google Sheets
│   │   ├── pusher/presence/    # Pusher auth for presence channel
│   │   └── auth/[...nextauth]/ # NextAuth.js handler
│   ├── admin/
│   │   ├── login/              # Admin login page
│   │   ├── dashboard/          # Admin overview
│   │   └── user-monitoring/    # Live user list + count
│   ├── editor/                 # Main editor page
│   └── components/
│       ├── editor/
│       │   ├── Analysis.tsx    # AI review panel
│       │   ├── Debug.tsx       # AI debug panel
│       │   ├── FileExplorer.tsx# Project file tree
│       │   ├── Output.tsx      # Execution output
│       │   ├── Terminal.tsx    # Terminal with stdin
│       │   └── Search.tsx      # In-file search
│       ├── LoginCard.tsx
│       ├── Navbar.tsx
│       ├── ProjectContext.tsx
│       └── PusherProvider.tsx
├── types/                      # Shared TypeScript types
├── public/                     # Static assets
├── drizzle.config.ts
└── package.json
```

---

## 🗄️ Database Schema

The database uses **PostgreSQL on Neon**, managed via **Drizzle ORM**.

```typescript
// app/lib/schema.ts
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  projectName: varchar('project_name', { length: 256 }),
  fileName: varchar('file_name', { length: 256 }).notNull(),
  blobUrl: varchar('blob_url', { length: 256 }).notNull(),
});
```

- **`id`** — Auto-incrementing primary key
- **`projectName`** — User-defined project name
- **`fileName`** — Original filename of the uploaded code
- **`blobUrl`** — URL pointing to the file content stored in Vercel Blob

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- Vercel account (for Blob storage)
- Judge0 API key (RapidAPI)
- OpenRouter or OpenAI API key
- Google & GitHub OAuth apps
- Pusher account
- Sentry project

### Installation

```bash
# Clone the repository
git clone https://github.com/H-sharma63/Minor-Project.git
cd Minor-Project

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# Database
DATABASE_URL=your_neon_postgres_url

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (User)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google OAuth (Admin)
ADMIN_GOOGLE_CLIENT_ID=your_admin_google_client_id
ADMIN_GOOGLE_CLIENT_SECRET=your_admin_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI
OPENROUTER_API_KEY=your_openrouter_key

# Code Execution
JUDGE0_API_KEY=your_judge0_rapidapi_key

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_blob_token

# Pusher
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster

# Sentry
SENTRY_DSN=your_sentry_dsn
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Migrations

```bash
# Push schema to Neon DB
npx drizzle-kit push
```

---

## 🔄 How It Works

```
User writes/uploads code
        ↓
  Monaco Editor (frontend)
        ↓
  ┌─────────────────────────────┐
  │   User triggers action:     │
  │  • Analyze → /api/analyze-code → OpenRouter → Analysis Panel  │
  │  • Debug   → /api/analyze-code → OpenRouter → Debug Panel     │
  │  • Run     → /api/run-code     → Judge0     → Terminal Output │
  │  • Save    → /api/save-project → Neon DB + Vercel Blob        │
  └─────────────────────────────┘
```

---

## 🔐 Authentication Flow

- **Users** log in via Google or GitHub OAuth through NextAuth.js
- **Admins** use a separate Google OAuth provider with restricted access
- Sessions are JWT-based and validated on protected routes

---

## 📊 System Architecture

```
Browser (Next.js Client)
        ↕
Vercel (Next.js Server / API Routes)
        ↕
┌──────────┬───────────┬──────────┬──────────┬──────────┐
│  Neon DB │  Vercel   │OpenRouter│  Judge0  │  Pusher  │
│(Postgres)│   Blob    │  (LLM)   │ (Run Code)│(Realtime)│
└──────────┴───────────┴──────────┴──────────┴──────────┘
```

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is for academic and portfolio purposes.

---

## 👤 Author

**Harshit Sharma**
[GitHub](https://github.com/H-sharma63)
