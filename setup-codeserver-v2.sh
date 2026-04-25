#!/bin/bash
exec > /tmp/codeshield-setup.log 2>&1
echo "[$(date)] Starting code-server installation..."

# Install code-server
if ! command -v code-server &> /dev/null
then
    echo "[$(date)] Installing code-server..."
    curl -fsSL https://code-server.dev/install.sh | sh
else
    echo "[$(date)] code-server already installed."
fi

# Configure code-server for the user
USER_NAME="g627harshit"
USER_HOME="/home/$USER_NAME"

echo "[$(date)] Configuring code-server for $USER_NAME..."
mkdir -p $USER_HOME/.config/code-server
cat > $USER_HOME/.config/code-server/config.yaml <<EOF
bind-addr: 0.0.0.0:8081
auth: none
cert: false
EOF

# Ensure permissions
chown -R $USER_NAME:$USER_NAME $USER_HOME/.config

# Setup systemd service
echo "[$(date)] Enabling systemd service..."
systemctl enable --now code-server@$USER_NAME
systemctl restart code-server@$USER_NAME

echo "[$(date)] Setup complete. code-server should be running on port 8081."
