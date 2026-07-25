# Security Policy

## Reporting a Vulnerability

openwts runs shell commands (git, AI coding agents) on your machine. That means security matters.

If you find a security vulnerability — especially anything related to command injection, path traversal, or unsafe execution — **please don't open a public issue**.

Email the maintainer directly or open a [GitHub Security Advisory](https://github.com/atpaawej/openwts/security/advisories/new).

We'll acknowledge receipt within 48 hours and work on a fix before disclosure.

## What to Report

- Command injection via worktree names, branch names, or arguments
- Path traversal that could write files outside intended directories
- Unsafe handling of environment variables or user input
- Anything that could let an attacker execute unintended commands

## Safe Harbor

We won't pursue legal action against researchers who report vulnerabilities in good faith and follow this policy.
