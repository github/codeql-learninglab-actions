#! /bin/bash

# Build the codeql-learninglab-check & course image, and run all queries in
# the course to ensure the expected result
#
# Should be run with the cwd being the course folder

set -e
set -x

# Extract the expected parent tag from course Dockerfile
PARENT_TAG=$(head -n 1 image/Dockerfile | awk -F ' ' '{print $2}')
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Build codeql-learninglab-check
docker pull $PARENT_TAG

# Run ./test-course-shared.sh
$DIR/test-course-shared.sh
