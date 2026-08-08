# 🤖 Autonomous AI Creator Engine — ViCodathon Submission

An advanced orchestration dashboard for an **Autonomous AI Creator Engine** built with Next.js 14 and Tailwind CSS. The platform features real-time telemetry streaming, memory layer routing, grounded source verification, and an interactive **Human-In-The-Loop (HITL)** governance interface.

---

## 🚀 Key Features

* **Human-In-The-Loop (HITL) Controls:** Real-time post evaluation interface allowing administrators to review, **APPROVE & DISPATCH**, or **REJECT** synthesized content before distribution.

* **Live Telemetry & Reasoning Logs:** Real-time background stream tracking agent activation signatures, model reasoning, and system operations.

* **Grounded Source Verification:** Interactive verification badges mapping content directly to trusted sources like arXiv and GitHub repositories.

* **Breeth Engine Integration:** API route architecture handling agent initialization and feed streaming with secure memory persistence.

---

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router, React Server Components)

* **Styling:** Tailwind CSS (Dark Cyberpunk Palette)

* **Language:** TypeScript

* **Deployment:** Vercel

---

## 📂 Project Structure

```text

vibe-code-hackathon/

├── [PROMPTS.md](http://PROMPTS.md)             # Required AI-usage log documentation

├── [README.md](http://README.md)              # Project architecture & setup documentation

├── .env.local             # Local environment configurations (Protected Key)

└── src/

    └── app/

        ├── layout.tsx     # Global layout shell

        ├── page.tsx       # Main Telemetry & HITL Governance Dashboard

        └── api/

            └── agent/

                ├── init/  # POST handler for agent initialization

                └── feed/  # GET handler returning synchronized post stream