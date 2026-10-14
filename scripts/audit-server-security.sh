#!/usr/bin/env bash
# Run on the Ubuntu server. Read-only: no installs, edits, reloads or restarts.
set -u
printf '\n--- UTC time ---\n'
date -u
printf '\n--- Listening TCP ports ---\n'
sudo ss -lntp
printf '\n--- Host firewall ---\n'
if command -v ufw >/dev/null 2>&1; then sudo ufw status verbose; fi
printf '\n--- SSH connection (client/server addresses and ports) ---\n'
printf '%s\n' "${SSH_CONNECTION:-not available}"
printf '\n--- Base SSH policy (Match rules may override this) ---\n'
sudo /usr/sbin/sshd -T | awk '/^(port|listenaddress|permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication|maxauthtries|maxstartups|allowusers|allowgroups) /'
printf '\n--- Nginx syntax check ---\n'
sudo nginx -t
printf '\n--- Nginx effective configuration ---\n'
printf 'Review/redact any credentials in custom proxy headers before sharing this section.\n'
sudo nginx -T
