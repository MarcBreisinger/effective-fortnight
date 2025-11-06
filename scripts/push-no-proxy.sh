#!/bin/bash
# Script to push to git without proxy

# Unset proxy variables
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy

# Configure git to not use proxy
git config --local http.proxy ""
git config --local https.proxy ""

# Push to remote
git push

# Check status
git status
