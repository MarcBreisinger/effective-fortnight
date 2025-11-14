#!/bin/bash

# Terminal Environment Repair Routine
# This script fixes common PATH and environment issues in VS Code terminals

echo "🔧 Terminal Environment Repair Routine"
echo "======================================"

# 1. Fix PATH - Add essential system paths
echo "Step 1: Restoring system PATH..."
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
echo "✓ Basic system paths restored"

# 2. Load Node.js environment via nvm
echo ""
echo "Step 2: Loading Node.js environment..."
if [ -f ~/.nvm/nvm.sh ]; then
    source ~/.nvm/nvm.sh
    echo "✓ nvm loaded successfully"
    echo "  Node.js version: $(node --version 2>/dev/null || echo 'not available')"
    echo "  npm version: $(npm --version 2>/dev/null || echo 'not available')"
else
    echo "⚠️  nvm not found, Node.js may not be available"
fi

# 3. Check git availability
echo ""
echo "Step 3: Verifying git..."
if command -v git >/dev/null 2>&1; then
    echo "✓ git is available: $(which git)"
else
    echo "✗ git not found - check PATH configuration"
fi

# 4. Check essential commands
echo ""
echo "Step 4: Checking essential commands..."
commands=("ls" "cd" "pwd" "grep" "find" "curl")
for cmd in "${commands[@]}"; do
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "✓ $cmd available"
    else
        echo "✗ $cmd missing"
    fi
done

# 5. Display current environment
echo ""
echo "Step 5: Current environment status:"
echo "  Working directory: $(pwd)"
echo "  Shell: $SHELL"
echo "  PATH: $PATH"

echo ""
echo "🎉 Terminal environment repair complete!"
echo ""
echo "Usage: source this script to apply changes to current session"
echo "  source scripts/fix-terminal-environment.sh"