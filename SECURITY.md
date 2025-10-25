# Security Policy

## Overview

This document outlines the security considerations, threat model, and best practices for the Amazon Cart MCP Server. This project is designed for **personal, single-user use** and is NOT suitable for production multi-tenant deployments without significant security enhancements.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Architecture

### Current Security Model

```
┌─────────────────────────────────────────────────────────┐
│ Threat Model: Personal Use Only                        │
│                                                         │
│ Trusted: Your local machine, your Amazon account       │
│ Untrusted: Network, ngrok, external clients           │
└─────────────────────────────────────────────────────────┘
```

## Security Assessment

### ✅ Implemented Security Controls

1. **Authentication**
   - Bearer token authentication for all requests
   - Configurable AUTH_TOKEN via environment variables
   - All requests require valid token

2. **Transport Security**
   - HTTPS via ngrok tunnel (TLS 1.2+)
   - Server-Sent Events (SSE) for real-time communication
   - localhost-only binding (not exposed to LAN)

3. **Data Protection**
   - Session data isolated in `./user-data/` directory
   - Credentials never logged or transmitted
   - `.gitignore` prevents accidental commits of sensitive data

4. **Input Validation**
   - Type checking via TypeScript
   - JSON-RPC 2.0 protocol validation
   - Parameter validation for tool calls

### ⚠️ Security Limitations

1. **Single-User Architecture**
   - No user management or multi-tenancy
   - Single AUTH_TOKEN for all access
   - No session management or token rotation

2. **Browser Security**
   - Puppeteer runs with `--no-sandbox` (required for some systems)
   - Persistent browser session stores sensitive cookies
   - No automatic session expiration

3. **Logging**
   - Verbose logging may expose request/response data
   - No audit trail for compliance
   - Console logs not encrypted at rest

4. **Rate Limiting**
   - No rate limiting implemented
   - Could be abused if AUTH_TOKEN is compromised
   - Amazon may rate-limit or block automated requests

5. **Secrets Management**
   - Secrets stored in plaintext `.env` file
   - No encryption at rest for configuration
   - No secrets rotation mechanism

## Threat Model

### In-Scope Threats

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| AUTH_TOKEN exposure | High | Medium | Use strong token, don't share ngrok URL |
| Session hijacking | High | Low | Localhost binding, HTTPS via ngrok |
| Credential theft | High | Low | User-data directory in .gitignore |
| Man-in-the-middle | Medium | Low | HTTPS enforced via ngrok |
| Denial of service | Low | Medium | Personal use only, restart if needed |

### Out-of-Scope Threats

- Multi-tenant attacks (not designed for multi-user)
- SOC 2 / HIPAA compliance (not applicable)
- DDoS at scale (ngrok provides some protection)
- Advanced persistent threats (personal use case)

## Security Best Practices

### For Users

#### 🔴 Critical

1. **Generate Strong AUTH_TOKEN**
   ```bash
   # Use cryptographically secure random token
   openssl rand -hex 32
   ```

2. **Never Commit Secrets**
   - Never commit `.env` file
   - Never commit `user-data/` directory
   - Verify `.gitignore` is in place

3. **Protect ngrok URL**
   - Don't share publicly
   - Consider ngrok authentication
   - Rotate if compromised

#### 🟡 Important

4. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   ```

5. **Monitor Access**
   - Review server logs regularly
   - Watch for unexpected requests
   - Note any failed authentication attempts

6. **Use HEADLESS Mode**
   - Set `HEADLESS=true` after initial login
   - Reduces attack surface
   - Prevents accidental exposure

#### 🟢 Recommended

7. **Regular Token Rotation**
   - Rotate AUTH_TOKEN monthly
   - Update in both `.env` and Poke

8. **Secure Your Machine**
   - Use full disk encryption
   - Enable firewall
   - Keep OS updated

9. **Limit Network Exposure**
   - Use ngrok free tier (random URLs)
   - Consider ngrok IP restrictions (paid tier)
   - Don't run on public WiFi without VPN

## Vulnerability Disclosure

### Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer via GitHub private contact
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

### Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 1-2**: Acknowledgment sent
- **Day 3-30**: Fix developed and tested
- **Day 30**: Public disclosure (coordinated)

## Known Security Issues

### Current Limitations

1. **No Rate Limiting**
   - **Impact**: Could be abused if token leaked
   - **Mitigation**: Use strong token, monitor logs
   - **Status**: By design (personal use)

2. **Plaintext Secrets Storage**
   - **Impact**: `.env` file contains sensitive data
   - **Mitigation**: File system permissions, .gitignore
   - **Status**: Acceptable for personal use

3. **No Session Expiration**
   - **Impact**: Amazon session persists indefinitely
   - **Mitigation**: Manual logout, periodic re-login
   - **Status**: By design (convenience)

4. **Verbose Logging**
   - **Impact**: Logs may contain request data
   - **Mitigation**: Secure log storage, periodic cleanup
   - **Status**: Acceptable for debugging

## Security Enhancements for Production

If you need to deploy this in a production environment, consider:

### Required Changes

1. **Authentication & Authorization**
   - Implement OAuth 2.0 or JWT
   - Per-user authentication
   - Role-based access control (RBAC)
   - Session management with expiration

2. **Secrets Management**
   - Use HashiCorp Vault, AWS Secrets Manager, or similar
   - Encrypt secrets at rest
   - Implement automatic rotation
   - Use environment-specific secrets

3. **Audit Logging**
   - Log all authentication attempts
   - Log all tool invocations
   - Include timestamps, user IDs, IP addresses
   - Store logs securely with retention policies
   - Implement log monitoring and alerting

4. **Rate Limiting**
   - Implement per-user rate limits
   - Protect against abuse and DoS
   - Consider tool-specific limits

5. **Data Encryption**
   - Encrypt session data at rest
   - Use secure key management
   - Consider field-level encryption

6. **Infrastructure**
   - Deploy to SOC 2 compliant cloud provider
   - Use container orchestration (Kubernetes)
   - Implement network segmentation
   - Use Web Application Firewall (WAF)
   - Enable DDoS protection

7. **Monitoring & Alerting**
   - Implement health checks
   - Set up error monitoring (Sentry, DataDog)
   - Configure alerts for security events
   - Implement uptime monitoring

8. **Compliance**
   - Document security controls
   - Implement data retention policies
   - Create incident response procedures
   - Conduct regular security audits
   - Obtain third-party security assessments

## Code Security Review

### Findings

#### ✅ Good Practices

- TypeScript for type safety
- Input validation via JSON-RPC schema
- .gitignore properly configured
- No hardcoded secrets in code
- CORS enabled but authentication required
- Localhost-only binding

#### ⚠️ Areas for Improvement

1. **Browser Sandbox Disabled**
   - Location: `src/browser.ts:188`
   - Risk: Reduced isolation for browser processes
   - Mitigation: Required for compatibility, acceptable for personal use

2. **Error Messages May Leak Information**
   - Location: Multiple error handlers
   - Risk: Stack traces could reveal internal structure
   - Mitigation: Sanitize error messages in production

3. **No Input Sanitization for Amazon Queries**
   - Location: `src/amazon.ts` - search and cart functions
   - Risk: Unusual inputs could cause unexpected behavior
   - Mitigation: Add input length limits and character validation

4. **Session Data Not Encrypted**
   - Location: `user-data/` directory
   - Risk: File system access = full session access
   - Mitigation: OS-level encryption, secure file permissions

## Dependency Security

### Current Status

Run regular security audits:

```bash
npm audit
```

### Known Dependencies

- `puppeteer` - Browser automation (maintained by Chrome team)
- `express` - Web framework (well-maintained)
- `@modelcontextprotocol/sdk` - MCP implementation
- `dotenv` - Environment configuration

### Recommendations

1. Enable GitHub Dependabot alerts
2. Run `npm audit` before each release
3. Keep all dependencies up to date
4. Review security advisories for critical dependencies

## Incident Response

### If AUTH_TOKEN is Compromised

1. **Immediately** stop the server
2. Generate new AUTH_TOKEN: `openssl rand -hex 32`
3. Update `.env` with new token
4. Update token in Poke
5. Restart server with new token
6. Review logs for unauthorized access
7. Consider rotating Amazon password if suspicious activity detected

### If Session Data is Compromised

1. Delete `./user-data/` directory
2. Log out of Amazon on all devices
3. Change Amazon password
4. Enable Amazon 2FA if not already enabled
5. Restart server and log in fresh

### If ngrok URL is Exposed

1. Stop ngrok tunnel
2. Start new tunnel (free tier gets new URL automatically)
3. Update URL in Poke
4. Consider upgrading to ngrok paid tier for reserved domains

## Compliance Considerations

### SOC 2 Type II

This project is **NOT SOC 2 compliant** out of the box. Required changes:

- ✅ Access controls (partially implemented)
- ❌ Change management procedures
- ❌ Risk assessment documentation
- ❌ Vendor management
- ❌ System monitoring
- ❌ Incident response plan
- ❌ Business continuity planning
- ❌ Audit logging and retention

### GDPR

For personal use: Not applicable (processing your own data).

For EU users in production:
- Implement data subject rights (access, deletion, portability)
- Document data processing activities
- Implement data retention policies
- Obtain explicit consent for data processing
- Implement breach notification procedures

### CCPA

For personal use: Not applicable.

For California residents in production:
- Provide privacy policy
- Implement "Do Not Sell" mechanisms
- Honor deletion requests
- Provide data access upon request

## Security Checklist

Before deploying:

- [ ] Strong AUTH_TOKEN generated
- [ ] `.env` in `.gitignore`
- [ ] `user-data/` in `.gitignore`
- [ ] Dependencies audited (`npm audit`)
- [ ] HEADLESS=true for production
- [ ] ngrok authentication configured (optional)
- [ ] Server logs monitoring set up
- [ ] Regular backup plan for session data
- [ ] Incident response plan documented
- [ ] Amazon Terms of Service reviewed

## Contact

For security concerns: Open a private security advisory on GitHub

---

**Last Updated:** 2025-01-25
**Next Review:** 2025-04-25
