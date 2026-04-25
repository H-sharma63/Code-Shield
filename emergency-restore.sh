#!/bin/bash
exec > /tmp/emergency-restore.log 2>&1
echo "[$(date)] Emergency Restore Starting..."

# 1. Restore Terminal Backend
echo "[$(date)] Looking for terminal backend..."
TARGET_DIR="/home/g627harshit/ai_based_code_reviewer"
if [ ! -d "$TARGET_DIR" ]; then
    TARGET_DIR="/home/g627harshit/Minor-Project"
fi

echo "[$(date)] Using directory: $TARGET_DIR"
cd "$TARGET_DIR/terminal-backend" || exit 1
npm install
nohup node server.js > /tmp/terminal-server-boot.log 2>&1 &
echo "[$(date)] Terminal backend launched."

# 2. Setup Code Server
echo "[$(date)] Installing code-server..."
if ! command -v code-server &> /dev/null
then
    curl -fsSL https://code-server.dev/install.sh | sh
fi

mkdir -p /home/g627harshit/.config/code-server
cat > /home/g627harshit/.config/code-server/config.yaml <<EOF
bind-addr: 0.0.0.0:8081
auth: none
cert: false
EOF

chown -R g627harshit:g627harshit /home/g627harshit/.config
systemctl enable --now code-server@g627harshit
systemctl restart code-server@g627harshit

echo "[$(date)] Emergency Restore Complete."
