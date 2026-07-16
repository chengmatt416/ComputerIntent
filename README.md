# Local Human Intent Controller (LHIC)

LHIC is a secure, high-performance, local-first browser automation runtime designed to translate human intent into deterministic, verifiable computer actions.

## 🚀 Key Features

*   **Fast Path Execution Engine**: Executes common browser tasks (login, forms, search, navigation) locally using Playwright and high-level skills, bypassing LLMs entirely. Achieving **100% Fast Path success rate** and **< 35ms median latency** on standard tasks.
*   **Self-Healing Semantic Locators**: Immune to typical website updates. Outperforms traditional static CSS/XPath selectors by **+80% success rate** under layout modifications.
*   **State-of-the-Art Security & KMS**:
    *   **KmsKeyManager**: Integrates AWS KMS, GCP KMS, and HashiCorp Vault key verification for high-risk actions.
    *   **AES-256-GCM Encryption**: Secure software-based database-level static encryption for sensitive user cookies and sessions.
    *   **PII & Credential Guard**: Automatically redacts credentials, passwords, and personally identifiable information from all system traces.
*   **Enterprise Concurrency & Durability**:
    *   **BrowserPool**: Thread-safe Chromium context pooling with pre-warming and state purification.
    *   **Account-level Locking**: Distributed SQL-based queue preventing overlapping executions on identical accounts.
    *   **Durable Workflows**: Resilient workflow execution with step recovery and state-saving.
*   **VNC Screencast Streaming**: CDP-based real-time JPEG screen frame broadcast at configurable frame rates (e.g., 10fps) for remote intervention.
*   **APM Observability**: OpenTelemetry (OTLP) exporting mapping tracking spans to central log systems.

## 📁 Package Monorepo Structure

*   `packages/schema`: Core Zod schemas and validation types.
*   `packages/browser`: Playwright CDP wrappers, Screencast, and BrowserPool.
*   `packages/verifier`: Dynamic DOM, URL, and file download verification.
*   `packages/trace`: Redacted JSONL event logs and OTel APM export.
*   `packages/memory`: SQLite workflow state and resilient selector memory.
*   `packages/security`: KMS key managers, PII redaction, and database encryption.
*   `packages/skills`: Fault-tolerant pre-defined browser skills.
*   `packages/controller`: Decision routing, confidence scorer, and Slow Path interface.
*   `apps/cli`: LHIC CLI command entrypoint (`lhic`).
*   `apps/mcp-server`: Standard Model Context Protocol stdio entrypoint and HTTP API Control Plane.

## 🛠️ CLI Commands & Usage

Install dependencies:
```bash
npm install
npm run build
```

Run preflight environment verification:
```bash
npm run preflight
```

Run action with human approval:
```bash
npx tsx apps/cli/src/main.ts run action <action-file> [approval-file]
```

Run internal regression benchmarks:
```bash
npm run bench:internal
```

Run selector resilience simulation:
```bash
npm run bench:simulate
```

## 📄 License

Dual-licensed under the MIT License and the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
