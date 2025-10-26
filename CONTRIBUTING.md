# Contributing to Amazon Cart MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check the [existing issues](https://github.com/meimakes/amazon-mcp-server/issues) to avoid duplicates
2. Ensure you're using the latest version
3. Test with a fresh installation if possible

When creating a bug report, include:
- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Numbered steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**:
  - OS: [e.g., macOS 14.0, Windows 11, Ubuntu 22.04]
  - Node.js version: [e.g., 20.10.0]
  - npm version: [e.g., 10.2.3]
- **Logs**: Relevant error messages or logs (sanitize any sensitive data!)
- **Screenshots**: If applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:
1. Check if the enhancement has already been suggested
2. Provide a clear and detailed explanation of the feature
3. Explain why this enhancement would be useful
4. Consider the scope (personal use vs. enterprise features)

### Pull Requests

#### Before Submitting

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** (see below)
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Run security checks**: `npm audit`

#### Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Add comments for complex logic
- Use meaningful variable and function names
- Keep functions focused and small

#### Commit Messages

Use clear, descriptive commit messages:

```
<type>: <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add rate limiting to API endpoints

Implements configurable rate limiting per endpoint
to prevent abuse. Defaults to 100 requests/hour.

Closes #123
```

```
fix: handle expired Amazon sessions gracefully

Previously would crash on expired session.
Now detects and prompts for re-authentication.

Fixes #456
```

#### Pull Request Process

1. **Update the README.md** if needed
2. **Update CHANGELOG.md** with your changes
3. **Ensure CI passes** (when implemented)
4. **Request review** from maintainers
5. **Address feedback** promptly

### Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/amazon-mcp-server.git
   cd amazon-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

5. Build:
   ```bash
   npm run build
   ```

### Testing

Currently, testing is manual:

1. Start the server: `npm start`
2. Start ngrok: `npm run tunnel`
3. Connect from Poke
4. Test each tool:
   - `search_amazon`
   - `add_to_cart`
   - `view_cart`
   - `check_login`

**Future**: Automated tests would be a great contribution!

## Security

### Reporting Security Vulnerabilities

**DO NOT** open a public issue for security vulnerabilities.

Instead:
1. Email the maintainer privately via GitHub
2. Follow responsible disclosure practices
3. See [SECURITY.md](SECURITY.md) for details

### Security Considerations for Contributions

When contributing:
- Never commit secrets or credentials
- Sanitize logs of sensitive data
- Follow secure coding practices
- Consider security implications of changes
- Document security-relevant changes

## Areas for Contribution

### High Priority

- [ ] Automated testing (unit tests, integration tests)
- [ ] Error handling improvements
- [ ] Input validation enhancements
- [ ] Rate limiting implementation
- [ ] Better logging (with log levels)

### Medium Priority

- [ ] Support for more Amazon domains
- [ ] Additional MCP tools (wishlists, order history, etc.)
- [ ] Configuration UI
- [ ] Docker support
- [ ] Health check improvements

### Low Priority

- [ ] Multi-user support (requires major architecture changes)
- [ ] Web dashboard
- [ ] Advanced shopping features (price tracking, recommendations)
- [ ] Integration with other AI assistants

## Documentation

Documentation improvements are always welcome:
- Fix typos or unclear wording
- Add examples
- Improve installation instructions
- Add troubleshooting guides
- Translate documentation

## Questions?

- Open an [issue](https://github.com/meimakes/amazon-mcp-server/issues) with the "question" label
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- CHANGELOG.md (for significant contributions)
- README.md acknowledgments section (coming soon)

Thank you for contributing! 🎉
