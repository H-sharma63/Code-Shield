#!/bin/bash
# Install code-server if not present
if ! command -v code-server &> /dev/null
then
    curl -fsSL https://code-server.dev/install.sh | sh
fi

# Create user config directory
mkdir -p /home/g627harshit/.config/code-server
cat > /home/g627harshit/.config/code-server/config.yaml <<EOF
bind-addr: 0.0.0.0:8081
auth: none
cert: false
EOF

# Ensure permissions
chown -R g627harshit:g627harshit /home/g627harshit/.config

# Restart code-server service for the user
systemctl enable --now code-server@g627harshit
systemctl restart code-server@g627harshit
