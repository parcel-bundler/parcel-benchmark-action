#!/bin/sh

# rust is installed in root HOME, certain rustup commands depends on $HOME Environment variable to find ~/.cargo
# GitHub Actions sets HOME to /github/home which breaks rustup
export HOME=/root
set -eu # stop on error
cd /usr/src/app/
yarn action-start
