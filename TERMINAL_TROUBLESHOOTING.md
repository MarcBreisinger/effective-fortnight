# Terminal Environment Issues - Diagnosis & Fix

## Problem Summary

**Issue**: VS Code integrated terminal loses essential system commands (`ls`, `git`, `node`, `npm`) due to corrupted or incomplete PATH environment variable.

**Symptoms**:
- Commands like `ls`, `git`, `node`, `npm` show "command not found"
- Basic navigation and development tools become unavailable
- PATH contains homebrew and custom paths but missing essential system paths like `/usr/bin`, `/bin`

## Root Cause Analysis

### Why This Happens

1. **VS Code Terminal Inheritance**: VS Code terminals inherit environment variables from the parent process, which can be incomplete if VS Code was launched in an unusual way

2. **macOS PATH Modifications**: Various tools (homebrew, nvm, custom installers) modify PATH in shell profiles, sometimes overriding instead of appending to system defaults

3. **Shell Profile Issues**: If `.zshrc`, `.bash_profile`, or other shell initialization files have errors or incomplete PATH settings

4. **VS Code Extension Conflicts**: Some extensions might modify the terminal environment in unexpected ways

### Specific PATH Issues Found

**Normal PATH should include**:
```bash
/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin
```

**Corrupted PATH was missing**:
```bash
/usr/bin:/bin:/usr/sbin:/sbin
```

**Only contained**:
```bash
/opt/homebrew/opt/postgresql@16/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/mysql/bin:/Users/q247532/.local/adpn/bin:/Users/Q247532/Library/Python/3.11/bin:...
```

## Quick Fix Routine

### Manual Fix (Immediate)
```bash
# 1. Restore system PATH
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# 2. Load Node.js environment (if using nvm)
source ~/.nvm/nvm.sh

# 3. Verify tools are working
which git && which node && which npm && which ls
```

### Automated Fix (Recommended)
```bash
# Use the repair script
source scripts/fix-terminal-environment.sh
```

## Permanent Prevention

### 1. Check Shell Profile

Ensure your `~/.zshrc` (for zsh) or `~/.bash_profile` (for bash) includes:

```bash
# System paths first
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"

# Add homebrew if installed
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

# Load nvm (Node Version Manager)
if [ -f ~/.nvm/nvm.sh ]; then
    source ~/.nvm/nvm.sh
fi

# Other custom paths go here
```

### 2. VS Code Settings

Add to VS Code settings.json:
```json
{
    "terminal.integrated.env.osx": {
        "PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:${env:PATH}"
    }
}
```

### 3. Launch VS Code Correctly

**Best practice**: Launch VS Code from terminal after environment is loaded:
```bash
# From project directory
code .
```

**Avoid**: Launching VS Code from Finder or Dock when environment isn't properly loaded.

## Diagnostic Commands

### Check Current State
```bash
# Check PATH contents
echo $PATH

# Check specific command locations
which git
which node
which npm
which ls

# Check if nvm is available
ls ~/.nvm/nvm.sh

# Check current shell
echo $SHELL
```

### Test All Essential Commands
```bash
# Basic system commands
ls --version
git --version
cd /tmp && pwd

# Development tools
node --version
npm --version

# macOS specific
brew --version  # if homebrew installed
```

## Troubleshooting Steps

### If Basic Commands Still Missing
1. Check if system installation is corrupted:
   ```bash
   /usr/bin/ls --version  # Use absolute path
   ```

2. Reinstall command line tools:
   ```bash
   xcode-select --install
   ```

### If Node.js/npm Still Missing
1. Reinstall Node.js via nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.nvm/nvm.sh
   nvm install node
   nvm use node
   ```

2. Or install via homebrew:
   ```bash
   brew install node
   ```

### If git Still Missing
1. Install via homebrew:
   ```bash
   brew install git
   ```

2. Or use system git:
   ```bash
   export PATH="/usr/bin:$PATH"
   ```

## Usage Instructions

### When Terminal Becomes Broken

**Option 1**: Use automated fix
```bash
source scripts/fix-terminal-environment.sh
```

**Option 2**: Manual fix
```bash
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
source ~/.nvm/nvm.sh
```

**Option 3**: Restart terminal
1. Close current terminal tab
2. Open new terminal tab in VS Code
3. Run fix script if issue persists

### Prevention Checklist

- [ ] Shell profile (`.zshrc`) includes proper PATH setup
- [ ] VS Code settings include terminal environment configuration
- [ ] Launch VS Code from terminal when possible
- [ ] Keep `fix-terminal-environment.sh` script handy
- [ ] Test environment after installing new development tools

## Files Modified for This Fix

1. **`scripts/fix-terminal-environment.sh`** - Automated repair routine
2. **This documentation** - Complete troubleshooting guide

## Related Issues

- This might be related to specific VS Code versions or extensions
- macOS updates sometimes reset PATH configurations
- Installing new development tools can modify PATH unexpectedly
- Docker Desktop and other applications can interfere with PATH

## References

- [VS Code Terminal Environment Variables](https://code.visualstudio.com/docs/terminal/environment)
- [macOS PATH Configuration](https://support.apple.com/guide/terminal/use-environment-variables-apd382cc5fa-4f58-4449-b20a-41c53c006f8f/mac)
- [nvm Installation Guide](https://github.com/nvm-sh/nvm)
- [Homebrew PATH Setup](https://docs.brew.sh/FAQ#my-mac-apps-dont-find-homebrew-utilities)