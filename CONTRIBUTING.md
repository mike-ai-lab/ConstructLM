# Contributing to ConstructLM

Thank you for your interest in contributing to ConstructLM! This guide will help you get started.

## 🚀 Quick Start for Contributors

### 1. Fork & Clone
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ConstructLM.git
cd ConstructLM-1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add at least one API key
# Get free API keys from:
# - Google Gemini: https://makersuite.google.com/app/apikey
# - Groq: https://console.groq.com/
```

### 4. Run Development Server
```bash
# For web app
npm run dev

# For Electron desktop app
npm run electron:dev
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing code structure and naming conventions
- Keep components modular and reusable
- Add comments for complex logic

### File Organization
- **App/** - Core application logic and state management
- **components/** - Reusable UI components
- **services/** - Business logic and API integrations
- **hooks/** - Custom React hooks
- **utils/** - Helper functions
- **styles/** - CSS files

### Before Submitting PR

1. **Test your changes** with at least one AI provider
2. **No API keys** - Ensure no API keys are committed
3. **Update docs** - Update README if adding features
4. **Clean code** - Remove console.logs and debug code
5. **Descriptive commits** - Use clear commit messages

### Commit Message Format
```
feat: Add new feature
fix: Fix bug in component
docs: Update documentation
style: Format code
refactor: Refactor service
test: Add tests
```

## 🐛 Reporting Issues

When reporting bugs, please include:
- **Description** - Clear description of the issue
- **Steps to reproduce** - How to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, browser, Node version
- **Screenshots** - If applicable

## 💡 Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Describe the feature clearly
- Explain the use case
- Consider implementation complexity

## 🔒 Security

- **Never commit** API keys or credentials
- **Report security issues** privately via email
- **Use .env.local** for all sensitive data
- **Review .gitignore** before committing

## 📦 Building

### Web App
```bash
npm run build
npm run preview
```

### Desktop App
```bash
npm run electron:build
```

## 🧪 Testing

Currently, testing is manual. We welcome contributions for:
- Unit tests
- Integration tests
- E2E tests

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the community

## 💬 Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for solutions

---

**Happy Contributing! 🎉**
