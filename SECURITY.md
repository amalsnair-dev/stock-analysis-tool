# Security Policy 🛡️

## Supported Versions

Only the latest release of the AURIX Mobile Application is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within the **AURIX Mobile Application**, please follow these responsible disclosure steps:

1. **Do not disclose the issue publicly** (via GitHub Issues or discussions).
2. Report the vulnerability privately via **[GitHub Private Vulnerability Reporting](https://github.com/BLOGTEC-SOFTWARE-LLP/aurix-mobile-app/security/advisories/new)** or by emailing the security team at **security@blogtec.in**.
3. Include detailed steps to reproduce the vulnerability, including:
   - Affected component (e.g., license verification, camera module, local storage).
   - Sample payload or request logs.
   - Severity assessment.

---

## Security Practices in AURIX
- **Credential Storage**: Sensitive tokens and company identifiers are encrypted using `expo-secure-store` backed by the device's hardware Keystore / Keychain.
- **Automated Security Scans**: Continuous code scanning with GitHub CodeQL (`+security-and-quality` rulesets).
- **Dependency Auditing**: Automatic vulnerability alerts and patches via Dependabot and npm audit.
