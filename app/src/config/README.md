# Configuration

This directory will hold all configuration-related logic for the app.

- **`index.ts` / `__init__.py`**: A module for loading and parsing the `.github/automation.yml` file from target repositories.
- **`schemas.ts` / `schemas.py`**: Contains validation schemas (e.g., using Zod or JSONSchema) to ensure the configuration file is well-formed.
