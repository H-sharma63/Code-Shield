# Gap Analysis: Minor Project (Actual) vs. Major Project (Proposed)

This document outlines the specific features and infrastructure gaps between the current state of the AI-Based Code Reviewer and the targets set for its "Major Project" version.

## Feature Breakdown & Gaps

| Feature Category | Actual State (Current) | Major Project Goal (The Gap) | Criticality |
| :--- | :--- | :--- | :--- |
| **Execution Environment** | External RapidAPI (Judge0). | **Dockerized/Self-hosted Judge0.** Move from third-party API dependency to isolated, containerized execution. | High |
| **Terminal/Console** | Basic `stdin` input and history list. | **Full Interactive Shell.** Implementation of a real terminal emulator (e.g., `xterm.js`) for command-line interaction. | High |
| **Report Delivery** | Simple `.txt` download button. | **PDF/Email Integration.** Generating professional reports (PDF) and integrating an email service (e.g., Resend). | Medium |
| **Collaboration** | Presence monitoring (viewing online users). | **Real-time Collaborative Editing.** Syncing code changes across multiple users simultaneously (Operational Transformation/CRDT). | High |
| **AI Refactoring** | Text-based AI suggestions. | **Automated Application.** "Apply Fix" functionality that programmatically updates the editor code. | Medium |
| **Version Control** | None. | **GitHub/GitLab Integration.** Full OAuth integration for pulling, pushing, and AI-powered PR reviews. | High |
| **Security Scanning** | Generic AI checks. | **SAST/DAST & Secrets Detection.** Specialized scanning for leaked API keys and OWASP compliance. | Medium |
| **Debugging** | AI suggestions for fixes. | **Visual Debugger.** breakpoints, variable inspection, and step-through execution UI. | High |
| **AI Models** | Fixed Claude 3.5 Sonnet. | **Dynamic Model Selection.** UI to switch between various LLMs (Gemini, GPT-4, etc.) via OpenRouter. | Low |

## Summary of Key Transitions

### 1. Infrastructure Shift
The transition requires moving from a pure **SaaS-consumption model** (using external APIs for everything) to an **Infrastructure-hosting model**. Self-hosting the execution engine in Docker provides the security and customizability expected of a major project.

### 2. Collaboration Depth
The project currently understands *who* is online via Pusher presence channels. The "Major" version must evolve to understand *what* they are typing, requiring real-time synchronization of the Monaco Editor state.

### 3. Professional Tooling
To reach a "Major" status, the UI must move beyond simple web forms to professional-grade components like `xterm.js` for terminals and integrated visual debuggers, mimicking the experience of high-end IDEs like VS Code.

### 4. Advanced AI Services
Moving beyond simple reviews to automated refactoring, deep security compliance scanning, and automated documentation generation will provide the "Enterprise" value-add.
