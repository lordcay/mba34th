#!/bin/bash
git add .
echo "version 1.1.0"
read msg
git commit -m "$msg"
git push origin main


# ✅ Step 3: Make It Executable
# In Git Bash or terminal, run:

# chmod +x deploy.sh
