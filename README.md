# Hiero GitHub Workflow App (v1)

This repository houses the source code and documentation for the Hiero Maintainer Automation Framework, developed as part of the LFX Mentorship 2026 for the Hiero Ledger (LFDT).

## Project Goal

Hiero’s bottleneck is not talent — it is time. Every contributor who asks for an assignment and waits for a human to check their qualifications is velocity lost. Every stale issue that lingers because no one ran the manual un-assignment check slows down the ecosystem. Every PR that lands in a maintainer’s queue without a first-pass DCO or quality check adds cognitive load that compounds across dozens of repositories and SDK languages.

The goal of this project is to automate repetitive maintainer tasks across the Hiero ecosystem to improve efficiency, ensure consistency, and enhance code quality. We are building production-hardened infrastructure that maintainers can rely on, absorbing the repetitive toil so maintainers can focus on decisions that actually require human judgement.

## Delivery Plan — Production-Hardened

### V0 (Foundation & Config Engine)
- Probot+TypeScript App skeleton
- Webhook ingestion pipeline & event router
- `.hiero.yml` config engine with schema validation to catch misconfigs
- Async job queue to prevent webhook timeouts
- PostgreSQL audit schema with idempotency keys
- `dry_run: true` global default
- Per-repo opt-in installation guide

### V1 (Core Automations)
- **Onboarding:** Bot-vs-human verification, contribution-threshold gates, `/assign me` commands, and automatic mentor rotation from a configurable pool.
- **PR Quality:** Parallel DCO/GPG/CI gates and AI-assisted initial reviews, file-ownership reviewer routing, and consolidated bot comments detailing what happened and why.
- **Issue Management:** Nightly stale detection, warning-to-unassign pipelines, and label-triggered team pings.
- **Audit Log:** Full audit logging where every action is reversible with a `maintainer/undo` command. Auto-merge and branch-protection bypasses are strictly blocked.

### V2 (Progression & Org Rollout)
- **Progression Engine:** Post-merge contributor state updates, automatic threshold checks for GFI → Beginner → Intermediate → JC → Committer with proactive notifications, and diversity-aware next-issue recommendation feeds.
- **AI Planning:** `maintainer/plan` commands to generate sub-task breakdowns and difficulty label recommendations.
- **Org Rollout:** Live on 3+ Hiero repos, with horizontal workers to scale seamlessly across the LFDT ecosystem.

## Architecture Overview

The framework is built around a central **GitHub App** whose backend service is located in the `app` directory of this repository. Target repositories install this app and add a simple `.hiero.yml` (or `.github/automation.yml`) file to configure its behavior.

1.  **`sdk-automations` (This Repository):**
    *   **GitHub App Backend (`/app`):** A web service that listens for webhook events from GitHub.
    *   **Reusable GitHub Actions (`/.github/actions`):** A collection of composable actions (like the `pr-review-bot` MVP) that can be used directly in target repository workflows.
    *   **Documentation (`/docs`):** Contains user guides for maintainers and developers.

2.  **Target Repositories:**
    *   **Installation:** Install the GitHub App to grant permissions.
    *   **Configuration:** A simple YAML file where maintainers enable or disable specific automation rules.

Open-source projects do not die from bad code — they die from contributor drop-off and maintainer burnout. This project attacks both directly, giving maintainers their time back and contributors a visible, rewarding path forward.
