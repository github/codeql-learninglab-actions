FROM docker.pkg.github.com/github/codeql-learninglab-actions/codeql-learninglab-check:v0.0.10

## Add course config
COPY --chown=codeql:codeql config /home/codeql/config
WORKDIR /home/codeql/config
# Download, unzip and then delete the zip file in one step to reduce image size
RUN wget --quiet https://downloads.lgtm.com/snapshots/cpp/GNU/glibc/bminor_glibc_cpp-srcVersion_333221862ecbebde60dd16e7ca17d26444e62f50-dist_odasa-lgtm-2019-04-08-af06f68-linux64.zip -O database.zip && unzip -qq database.zip && rm -rf database.zip
