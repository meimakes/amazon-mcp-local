# Contributing to Amazon MCP Server

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env` and configure
4. **Run in dev mode**: `npm run dev`

## Development

- **Build**: `npm run build`
- **Start**: `npm start`
- **Tunnel**: `npm run tunnel` (requires ngrok)

## Submitting Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes and test thoroughly
3. Commit with clear messages
4. Push to your fork and submit a pull request

## Guidelines

- Follow existing code style (TypeScript, consistent formatting)
- Test your changes with real Amazon interactions
- Keep commits focused and atomic
- Update documentation if needed

## Reporting Issues

Use [GitHub Issues](https://github.com/meimakes/amazon-mcp-server/issues) to report bugs or suggest features. Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version)

## Questions?

Open a discussion or issue on GitHub.

---

**Note**: This project automates Amazon interactions. Please review and comply with [Amazon's Terms of Service](https://www.amazon.com/gp/help/customer/display.html?nodeId=508088).
