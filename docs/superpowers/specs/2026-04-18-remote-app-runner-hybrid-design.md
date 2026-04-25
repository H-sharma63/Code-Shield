# Design Doc: Remote App Runner with Hybrid Intelligence (GCP + Monaco)

## Goal
Transform CodeShield into a "Headless IDE" where the browser (Monaco) handles the logic and editor state, while a persistent GCP VM handles the resource-heavy execution, persistent `node_modules`, and type generation.

## Architecture Overview

### 1. Workspace Engine (GCP VM)
- **Persistent Storage:** Workspaces are stored in `/home/Suresh/codeshield-workspaces/[owner]/[repo]`.
- **Terminal Backend:** A Node.js service (`terminal-backend`) that bridges WebSockets to a local shell.
- **Port Observer:** Automatically detects when an app starts (e.g., port 3000) and spawns a Cloudflare tunnel.
- **Type Provider:** Scans `node_modules` and generated folders (like `.next/types`) to stream `.d.ts` files back to Monaco.

### 2. Intelligent Frontend (Next.js + Monaco)
- **Monaco Editor:** The primary interface for code editing.
- **Hybrid Type Acquisition:**
    - **Fast Path:** Uses browser-side ATA (`@typescript/ata`) to fetch standard package types from the internet.
    - **Truth Path:** Receives generated and local types directly from the GCP VM via WebSockets.
- **Real-time Source Sync:** Debounced keystrokes or "Save-to-Sync" events are sent to the GCP VM to update the execution environment.

## Data Flow

### File Synchronization (Browser -> GCP)
1. User types or saves in Monaco.
2. Frontend sends `sync-file` event via WebSocket: `{ filePath, content }`.
3. GCP Backend writes the content to the corresponding file on the 50GB disk.
4. Next.js/Vite dev server on GCP detects the file change (HMR) and rebuilds.

### IntelliSense Sync (GCP -> Browser)
1. User runs `npm install` in the browser terminal (executing on GCP).
2. Once complete, GCP Backend scans for new `.d.ts` files.
3. Backend sends `sync-types` event: `{ path, definitions }`.
4. Monaco injects these using `monaco.languages.typescript.typescriptDefaults.addExtraLib()`.

### Preview Tunneling (GCP -> Browser)
1. Dev server starts on port `3000` inside the GCP VM.
2. `terminal-backend` detects the new port.
3. `cloudflared` starts an outbound tunnel.
4. Public URL (e.g., `https://*.trycloudflare.com`) is sent to the frontend.
5. Frontend updates the preview iframe with the public URL.

## Security & Performance
- **Debouncing:** Sync events will be debounced by 1.5 seconds to prevent overwhelming the `e2-micro` CPU.
- **Persistent Disk:** The 50GB disk ensures that large `node_modules` folders remain available between sessions.
- **Zero Firewall Ports:** All traffic for tunnels and WebSockets uses outbound connections or standard port 8080 (already allowed).

## Success Criteria
- [ ] Monaco displays no "Module not found" errors for packages installed on the GCP VM.
- [ ] Changes in Monaco are reflected in the preview window within 2 seconds of saving.
- [ ] `node_modules` persist after a VM reboot or session disconnect.
- [ ] Public preview URL is automatically generated and displayed in the IDE.
