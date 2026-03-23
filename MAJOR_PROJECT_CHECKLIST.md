# Major Project Checklist: CodeShield

This document tracks the tasks required to convert CodeShield from a minor to a major project.

**Status Key:**
- [o] = In Progress / Planned
- [x] = Completed

---

### Phase 1: The AI "Brain" Upgrade (Highest Priority)
- [x] Vertex AI Integration (Setup @google-cloud/vertexai)
- [x] Multi-Model Router (Backend refactor for Claude, Gemini, Mistral, Qwen, GPT-OSS)
- [x] Dynamic Selection UI (Model selection dropdown in Editor)
- [o] Model-Specific Prompts (Tailored prompts for analysis, debug, tests)
- [o] Usage & Cost Tracking (Uncomment apiUsage table and implement logging)

### Phase 2: Full GitHub Integration (The "Nervous System")
- [x] Auth Expansion (Update NextAuth scopes for `repo` access)
- [x] GitHub File Explorer (Real-time recursive Octokit integration)
- [x] Git Operations: Commit & Push (Core API implemented)
- [x] Source Control Sidebar Panel (VS Code style UI with Push/Pull/Sync)
- [/] Multi-File Tabbed Interface (Managing multiple file models in Monaco)
- [o] Git Operations: Branch Management
- [o] AI-Powered PR Review (Analyze GitHub Diff and generate report)

### Phase 3: Project-Level Review & Integration Testing
- [o] Workspace Context Engine (Bundle multiple files for cross-file analysis)
- [o] Integration Test Generator (Add "Gen Tests" tab and test-file generation)
- [o] Architecture Auditor (Gemini-powered project-wide structure analysis)

### Phase 4: Professional Tooling & UI
- [o] Real Terminal Upgrade (Integrate xterm.js)
- [o] Multi-File Tabbed Interface (Open and manage multiple files simultaneously)
- [o] WebContainers Integration (Run full React/Next.js/Vite projects directly in the browser)
- [o] **Self-Hosting Meta-Challenge:** Run CodeShield inside CodeShield (Execute `npm run dev` within the editor)
- [o] Visual Debugger UI (Breakpoints and AI-simulated state)
- [o] PDF Report Delivery (Downloadable project review reports)
- [o] Automated Documentation (One-click README and JSDoc generation)

### Phase 5: Deep Security & Deployment
- [o] Secrets Scanner (Detection of leaked API keys/passwords)
- [o] SAST (Security checks against OWASP Top 10)
- [o] Infrastructure Hosting (Self-hosted Judge0 on Google Cloud Run - BACKED BY ₹110k CREDITS)
