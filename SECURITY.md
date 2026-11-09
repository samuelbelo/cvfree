# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private reporting instead: **Security → Report a vulnerability** on this repository. It opens a private advisory that only the maintainers can see.

Include what you found, how to reproduce it, and what it lets an attacker do. A suggested fix is welcome but not needed.

You will get an acknowledgment within 48 hours and a status update within 7 days. The fix and the public disclosure are coordinated with you.

## Supported versions

| Version | Supported |
| --- | --- |
| latest release | Yes |
| older releases | No, update to the latest |

## What the app does and does not protect

- `CVFREE_PASSWORD` is one password for the whole instance. Everyone who has it can see and edit every resume. There are no per-user accounts.
- Without a password, anyone who can reach the port can read and change every resume. Keep it on a private network or set the password.
- Job postings are fetched from public addresses only. Private networks, loopback, cloud metadata addresses and redirects to any of them are refused.
- Rich text is cleaned with an allowlist on save and on render, including imported JSON.
- Logins are rate limited per client address. The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` behind HTTPS.
- The MCP endpoint (`/mcp`) gives an AI assistant the same access as the password: every resume and cover letter. It needs its own bearer token (`CVFREE_MCP_TOKEN`). With a password set and no token it stays off, and wrong tokens are rate limited like wrong passwords.
- The AI features are off until you configure a provider. When on, the resume and the job posting are sent to that provider and nowhere else.

## Self-hosting checklist

1. Set `CVFREE_PASSWORD` before exposing the app to the internet.
2. Put it behind HTTPS (the compose file ships a Caddy profile) and set `CVFREE_BIND=127.0.0.1`, so the app is only reachable through the proxy.
3. Keep the image updated. Releases are tagged and listed in [CHANGELOG.md](CHANGELOG.md).
4. Back up the data volume. Each resume is one JSON file.
