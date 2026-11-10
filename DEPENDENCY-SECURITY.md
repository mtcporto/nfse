# Dependency remediation — 2026-11-10

Updates the compatible transitive body-parser 2.x dependency to 2.4.0 in the lockfile. Existing PR #11 separately patches launch-editor; this PR does not duplicate that change or introduce another major.

## Local validation

- Node 24.22.1 and npm 10.9.4 explicitly selected.
- Clean `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` passed.
- `npm test --ignore-scripts` passed, including generated local certificate/PFX fixtures.
- `npm run build --ignore-scripts` passed.
- The first test attempt failed because `openssl` was absent from PATH, not because of an application assertion. Re-running with the already installed Git OpenSSL 3.2.4 directory on this validation process's PATH passed. No global PATH or production configuration was changed.
- Installation lifecycle scripts were disabled. Test certificates are disposable synthetic fixtures, not production credentials.

No remote merge, deploy, publish, migrations, production/infrastructure configuration changes, or inspection of env/secrets. Existing remote automation may run on push/PR. Default-branch alerts require merge and GitHub re-evaluation.
