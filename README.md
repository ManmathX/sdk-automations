# Hiero Maintainer Automation Framework

This repository houses the source code and documentation for the Hiero Maintainer Automation Framework.

## Project Goal

The goal of this project is to automate repetitive maintainer tasks across the Hiero ecosystem to improve efficiency, ensure consistency, and enhance code quality. This is achieved through a central, configurable GitHub App that can be installed on various Hiero repositories.

## Architecture Overview

The framework is built around a central **GitHub App** whose backend service is located in the `app` directory of this repository. Target repositories (e.g., `hiero-sdk-python`) install this app and add a simple `.github/automation.yml` file to configure its behavior.

1.  **`sdk-automations` (This Repository):**
    *   **GitHub App Backend (`/app`):** A web service that listens for webhook events from GitHub (e.g., `issues.opened`, `pull_request.opened`). It contains the core logic for all automation workflows.
    *   **Reusable GitHub Actions (`/.github/actions`):** A collection of composable actions that can be used by the app or directly in target repository workflows.
    *   **Documentation (`/docs`):** Contains user guides for maintainers on how to configure the framework and developer guides for contributing to it.

2.  **Target Repositories (e.g., `hiero-sdk-python`):**
    *   **Installation:** They install the GitHub App, granting it the necessary permissions.
    *   **Configuration (`.github/automation.yml`):** A simple YAML file where maintainers enable or disable specific automation rules (e.g., `onboarding-checks: true`, `stale-issue-closure: false`). The app's backend reads this file via the GitHub API to determine its behavior for that repository.

This decoupled architecture allows the automation logic to be developed and managed centrally while giving individual repository maintainers full control over which features they use.
