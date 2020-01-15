#! /bin/bash

# Test that the queries in ../answers produce the expected results

set -e
set -x

TMP=$PWD/tmp
# Extract the expected parent tag from course Dockerfile
PARENT_TAG=$(head -n 1 Dockerfile | awk -F ' ' '{print $2}')
TAG=ci-test

# Build codeql-learninglab-check
docker build -t $PARENT_TAG ../../../../codeql-learninglab-check

# Build course image
docker build -t $TAG .

# Prepare temporary folder to mount into docker
mkdir -p $TMP
cp -R ../answers $TMP/answers
echo "{}" > $TMP/event.json

# Run docker image
docker run -i \
  -e GITHUB_EVENT_NAME=push \
  -e GITHUB_EVENT_PATH=/opt/tmp/event.json \
  -e GITHUB_TOKEN=noop \
  -e RUN_ALL=true \
  -e SKIP_COMMENT=true \
  -v $TMP:/opt/tmp:ro \
  -w /opt/tmp/answers \
  $TAG