FROM docker.pkg.github.com/github/codeql-learninglab-actions/codeql-learninglab-check:v2.0.0

## Add course config
COPY --chown=codeql:codeql config /home/codeql/config
WORKDIR /home/codeql/config
# Download, unzip and then delete the zip file in one step to reduce image size
RUN wget --quiet https://downloads.lgtm.com/snapshots/cpp/uboot/u-boot_u-boot_cpp-srcVersion_d0d07ba86afc8074d79e436b1ba4478fa0f0c1b5-dist_odasa-2019-07-25-linux64.zip -O database.zip && unzip -qq database.zip && rm -rf database.zip
