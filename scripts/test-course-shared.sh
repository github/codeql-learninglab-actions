#! /bin/bash

# Build the course image, and run all or specific queries in
# the course to ensure the expected result
#
# Should be run with the cwd being the course folder

set -e
set -x

TMP=$(mktemp -d -t ci-XXXXXXXXXX)
TAG=ci-test

# Build course image
docker build -t $TAG image

# Prepare temporary folder to mount into docker
mkdir -p $TMP
cp -R answers $TMP/answers
echo "{}" > $TMP/event.json

# Get query argument
RUN_ALL=true
QUERY_PATTERN=""
if [ "$1" != "" ]; then
    RUN_ALL=false
    QUERY_PATTERN=$1
    echo "Running specific queries $QUERY_PATTERN"
else
    echo "Running all queries"
fi

# Run docker image
docker run -i \
  -e GITHUB_EVENT_NAME=push \
  -e GITHUB_EVENT_PATH=/opt/tmp/event.json \
  -e GITHUB_TOKEN=noop \
  -e RUN_ALL=$RUN_ALL \
  -e QUERY_PATTERN=$QUERY_PATTERN \
  -e SKIP_COMMENT=true \
  -v $TMP:/opt/tmp:ro \
  -w /opt/tmp/answers \
  $TAG