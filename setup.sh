#!/bin/bash
# setup.sh - Install project dependencies

# Install Node packages (uses package.json and package-lock.json)
npm ci

# Install Supabase CLI globally
npm install -g supabase

# (Optional) Start Docker if your migrations require a database container.
# sudo service docker start

# Add other commands you may need, such as installing additional tools.
