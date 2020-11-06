FROM docker.pkg.github.com/github/codeql-learninglab-actions/codeql-learninglab-check:v2.0.0

## Add course config
COPY --chown=codeql:codeql config /home/codeql/config
WORKDIR /home/codeql/config
# Download, unzip and then delete the zip file in one step to reduce image size
RUN wget --quiet https://drive.google.com/open?id=10ju0t2QZjsKI8qrAqwzsPA3K-lBgqPVF -O database.zip && unzip -qq database.zip && rm -rf database.zip
