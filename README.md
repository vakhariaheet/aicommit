# 🤖 AICommit

AICommit is a powerful CLI tool that uses either Google's Gemini or OpenAI's GPT models to generate meaningful and descriptive commit messages based on your code changes. It supports conventional commits, emojis, and various customization options.

## ✨ Features

- 🤖 Supports both Google Gemini and OpenAI GPT models
- 🧠 Multiple model options for each provider
  - Gemini: gemini-2.0-flash, gemini-2.0-flash-vision
  - OpenAI: gpt-4, gpt-4-turbo-preview, gpt-4.1-nano, gpt-4.1-nano-16k
- 📝 Generates conventional commit messages with appropriate types
- 🎯 Supports commit scopes and breaking changes
- 🔄 Amend existing commits
- 🎨 Emoji support
- 🎯 File selection for staged changes
- ⚡ Fast and efficient
- 🔧 Highly configurable
- 📊 Verbose mode with timing information
- 🎯 Interactive commit confirmation
- 🔄 Custom prompts support

## 📦 Installation

```bash
# Using npm
npm install -g @vakhariaheet/aicommit

# Using yarn
yarn global add @vakhariaheet/aicommit

# Using bun
bun install -g @vakhariaheet/aicommit
```

## 🔑 Setup

On first run, AICommit will guide you through the setup process:

1. Choose your preferred AI provider (Gemini or OpenAI)
2. Select your preferred model
3. Enter your API key
4. Configure default settings

You can also set up manually:

```bash
# For Gemini
aicommit config --key YOUR_GEMINI_API_KEY --provider gemini
aicommit config --model gemini-2.0-flash

# For OpenAI
aicommit config --key YOUR_OPENAI_API_KEY --provider openai
aicommit config --model gpt-4.1-nano
```

## 📚 Usage

### Basic Usage

```bash
# Generate commit message for all staged changes
aicommit

# Generate commit message for specific files
aicommit -f "file1.ts file2.ts"

# Generate commit message with emoji
aicommit --emoji

# Generate commit message with scope
aicommit --scope api

# Generate commit message with breaking change
aicommit --breaking

# Generate multiline commit message
aicommit --multiline

# Amend previous commit with new message
aicommit --amend

# Use custom prompt
aicommit --custom-prompt "Your custom prompt here"

# Show timing information
aicommit --verbose

# Push changes after commit
aicommit --push

# Use a specific model for this commit
aicommit --model gpt-4
```

### Command Options

#### Basic Options
```bash
-p, --push              # Push changes after commit
-m, --multiline        # Generate detailed commit message
-d, --dry-run         # Show what would be done without changes
-v, --verbose         # Show detailed progress information
-a, --amend           # Amend the last commit
```

#### Commit Content
```bash
-f, --files <files>    # Comma-separated list of files to commit
-t, --type <type>     # Commit type (feat, fix, etc.)
-s, --scope <scope>   # Commit scope (e.g., auth, ui)
-b, --breaking        # Mark as breaking change
-r, --ref <reference> # Add issue/PR reference
```

#### Message Style
```bash
-e, --emoji           # Include emoji (default: true)
--no-emoji           # Disable emoji
-c, --custom-prompt  # Custom prompt for AI
```

#### Special Actions
```bash
--revert             # Revert last commit
```

### Configuration

Set default values for any option:
```bash
# Set defaults
aicommit config --set push true
aicommit config --set emoji true
aicommit config --set multiline true
aicommit config --set scope api

# Change AI model
aicommit config --model gpt-4  # For OpenAI
aicommit config --model gemini-2.0-flash  # For Gemini

# List current defaults
aicommit config --list

# Remove a default
aicommit config --remove push
aicommit config --remove emoji
```

### Commit Types

Supported conventional commit types:
- feat: New features
- fix: Bug fixes
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding/updating tests
- build: Build system changes
- ci: CI configuration changes
- chore: General maintenance
- revert: Revert changes

## 🔧 Configuration File

Configuration is stored in `~/.aicommit` as a JSON file with the following structure:
```json
{
  "GEMINI_API_KEY": "your-api-key",
  "IS_FREE_ACCOUNT": true,
  "defaults": {
    "push": false,
    "multiline": false,
    "verbose": false,
    "type": "feat",
    "emoji": true,
    "scope": null,
    "breaking": false
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this in your projects! 



