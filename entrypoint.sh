#!/bin/bash -l

ls -lah /root
cat /root/.bashrc
echo $PATH
echo $HOME
set -eu # stop on error
cd /usr/src/app/
yarn action-start
