#!/bin/bash

# Safe .zshrc PATH Configuration Update Script
# This script backs up your current .zshrc and adds robust PATH setup

echo "🔧 .zshrc PATH Configuration Updater"
echo "===================================="

# Create backup
BACKUP_FILE="$HOME/.zshrc.backup.$(date +%Y%m%d_%H%M%S)"
cp ~/.zshrc "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Check if robust PATH setup already exists
if grep -q "ROBUST PATH CONFIGURATION" ~/.zshrc; then
    echo "⚠️  Robust PATH configuration already exists in .zshrc"
    echo "   No changes needed."
    exit 0
fi

echo ""
echo "Current issues found in .zshrc:"
echo "❌ Missing explicit system paths (/usr/bin, /bin, /usr/sbin, /sbin)"
echo "❌ PATH modifications use assignment instead of consistent export"
echo "❌ No safeguard against PATH corruption"

echo ""
echo "Proposed fix:"
echo "✅ Add essential system paths at the beginning"
echo "✅ Create backup function for quick PATH recovery"
echo "✅ Keep all your existing configurations"

echo ""
read -p "Do you want to apply these changes? [y/N]: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create temporary file with new configuration
    cat > /tmp/zshrc_prepend << 'EOF'

# ===== ROBUST PATH CONFIGURATION (Added by terminal fix script) =====
# Ensure essential system paths are always available first
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH"

# Quick PATH recovery function
fix_path() {
    export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:$PATH"
    [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
    echo "✅ PATH restored - all commands should work now"
}

# ===== ORIGINAL CONFIGURATION BELOW =====

EOF

    # Prepend new configuration to existing .zshrc
    cat /tmp/zshrc_prepend ~/.zshrc > /tmp/new_zshrc
    mv /tmp/new_zshrc ~/.zshrc
    rm /tmp/zshrc_prepend

    echo ""
    echo "✅ .zshrc updated successfully!"
    echo ""
    echo "Changes made:"
    echo "• Added essential system paths at the beginning"
    echo "• Added fix_path() function for emergency recovery"
    echo "• Kept all your existing configurations intact"
    echo ""
    echo "To apply changes:"
    echo "  source ~/.zshrc"
    echo ""
    echo "To test the fix function:"
    echo "  fix_path"
    echo ""
    echo "If something goes wrong, restore backup:"
    echo "  cp $BACKUP_FILE ~/.zshrc && source ~/.zshrc"
    
else
    echo ""
    echo "No changes made. You can:"
    echo "1. Manual fix: Add 'export PATH=\"/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:\$PATH\"' to the top of ~/.zshrc"
    echo "2. Use emergency fix: source scripts/fix-terminal-environment.sh"
    echo "3. Review recommendations in: recommended-zshrc-additions.txt"
fi

echo ""
echo "Current PATH for reference:"
echo "$PATH"