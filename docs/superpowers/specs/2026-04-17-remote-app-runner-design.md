# Design Doc: Remote App Runner with GCP & Dynamic Tunneling

**Status:** Finalized (Awaiting User Review)
**Date:** 2026-04-17
**Author:** Harshit Sharma / Gemini CLI

## 1. Objective
Enable CodeShield users to run full-stack applications (Next.js, Vite, React, Express, etc.) directly on a persistent GCP VM with full terminal control, persistent `node_modules`, and automated public URL generation using a vanity naming schema.

## 2. Architecture
The system follows a hybrid cloud model split between the frontend and the workspace engine.

### 2.1 Component Overview
- **Frontend (Vercel):** `codeshield-app.vercel.app` hosting the Next.js UI, Monaco Editor, and Xterm.js terminal.
- **Workspace Engine (GCP VM):** A persistent Linux instance acting as the execution environment.
- **Terminal Backend (Node.js):** A service on the GCP VM that bridges browser WebSockets to the remote shell and manages the tunnel lifecycle.
- **Tunneling Layer:** Dynamic routing between **Localtunnel** (Primary) and **Cloudflare Tunnels** (Fallback).

### 2.2 Data & Execution Flow
1. **Connection:** Browser establishes a WebSocket connection to the GCP Terminal Backend.
2. **Interactive Terminal:** User sends keystrokes (e.g., `npm i`, `npm run dev`) which are executed on the VM.
3. **Smart Observer:** The backend monitors the VM for new open ports (e.g., 3000).
4. **Auto-Tunneling:** As soon as a port opens, the backend requests a tunnel with the subdomain: `{username}-{project}.codeshield`.
5. **Output Rewriting:** The backend intercepts stdout from the dev server, replacing `http://localhost:XXXX` with the public `https://...loca.lt` URL in real-time.
6. **Persistence:** `node_modules` and files are stored on the VM's disk, ensuring they are steady across browser refreshes.

### 2.3 Isolated Workspace Management
To ensure a steady state and prevent dependency conflicts, the GCP VM will use a structured workspace system:
- **Root Directory:** `/home/codeshield/workspaces/`
- **Repo Isolation:** Each project is cloned into its own folder: `/workspaces/{repo-owner}/{repo-name}/`
- **Node Modules Persistence:** `node_modules` are stored directly within each repo folder. Since the VM disk is persistent, once `npm install` is run for a specific repo, it remains there for future sessions.
- **Environment Separation:** Each terminal session is restricted to its specific repo path, ensuring users only interact with their own files.

## 3. Detailed Features

### 3.1 Persistence & Stability
- **VM State:** The GCP VM remains active, allowing users to leave an installation running or keep a dev server alive.
- **File Sync:** Code edits in the browser are synced to the VM filesystem via the existing Socket.io/API bridge.

### 3.2 Dynamic Vanity URLs
- **Format:** `https://{username}-{project}.codeshield.loca.lt`
- **Priority 1 (Localtunnel):** Attempt to claim the specific subdomain name for a personalized experience.
- **Priority 2 (Cloudflare):** If Localtunnel is down or the name is taken, fallback to a random Cloudflare Quick Tunnel (`trycloudflare.com`).

### 3.3 Log Interception (URL Masking)
- The WebSocket stream will include a "rewrite layer" using regex to swap internal addresses with public ones.
- **Example:** 
  - *Original:* `- Local: http://localhost:3000`
  - *Transformed:* `- Local: https://user-app.codeshield.loca.lt`

## 4. Security & Error Handling
- **Outbound Tunnels:** No firewall ports need to be opened on GCP for the app preview, as tunnels use outbound connections.
- **Process Isolation:** User sessions are managed by the Terminal Backend to ensure process cleanup on disconnect.
- **Fallback Logic:** Automated transition between tunneling providers ensures the "Run" experience never fails.

## 5. Implementation Roadmap
1. **Terminal Backend Upgrade:** Enhance `server.js` on GCP to include the "Smart Observer" port detection logic.
2. **Tunnel Manager Logic:** Implement the dynamic fallback between `localtunnel` and `cloudflared`.
3. **Log Rewriter:** Add the regex replacement layer to the WebSocket output stream.
4. **Frontend Integration:** Update the CodeShield UI to handle the incoming public URLs and display them in the terminal.
