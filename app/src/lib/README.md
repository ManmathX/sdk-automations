# Library / Services

This directory will contain higher-level services and business logic that are used by the webhook handlers. This helps keep the handlers clean and focused on orchestration.

Examples:
- `githubService.ts`: A wrapper around the GitHub API client (e.g., Octokit) to simplify interactions like posting comments or adding labels.
- `userService.ts`: Logic for managing user progression, checking qualifications, and tracking contributor activity.
- `issueService.ts`: Logic related to issue management, such as determining if an issue is stale or finding a suitable issue to recommend to a contributor.
