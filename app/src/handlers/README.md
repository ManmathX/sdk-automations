# Webhook Handlers

This directory contains the core logic for handling specific webhook events from GitHub. Each file or subdirectory will correspond to a different event.

For example:
- `issue_comment/created.ts`: Logic to execute when a new issue comment is created.
- `issues/opened.ts`: Logic for when a new issue is opened (e.g., to apply labels or assign a mentor).
- `pull_request/opened.ts`: Logic for when a new PR is opened (e.g., to run initial quality checks).

Each handler will be responsible for parsing the event payload, checking the repository's configuration, and executing the appropriate actions.
