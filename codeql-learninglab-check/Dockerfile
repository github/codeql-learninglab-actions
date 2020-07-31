FROM ubuntu:19.04

RUN apt-get update
RUN apt-get install -y wget unzip

RUN useradd codeql
RUN mkdir ~codeql
RUN chown codeql:codeql ~codeql

# Install CodeQL
USER codeql
WORKDIR /home/codeql
RUN mkdir ~/codeql-home
RUN wget --quiet https://github.com/github/codeql-cli-binaries/releases/download/v2.2.4/codeql.zip -O codeql-2.2.4.zip && unzip ~/codeql-2.2.4.zip -d /home/codeql/codeql-home/ && rm -f ~/codeql-2.2.4.zip && mv ~/codeql-home/codeql ~/codeql-home/codeql-cli

ENV PATH="/home/codeql/codeql-home/codeql-cli/:${PATH}"

# Install NodeJS and NPM (for action code)
USER root
RUN apt-get install -y git curl
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs

# Temporarily disable running script as user codeql as we're unable to run
# certain git commands due to permissions
# USER codeql

# Add CodeQL repo
RUN git clone https://github.com/Semmle/ql.git /home/codeql/codeql-home/codeql-repo

WORKDIR /home/codeql/codeql-home/codeql-repo/
RUN git checkout ed97be459fed23c9f07a0e1895176bad7ba6c686

# Add and build code action code
COPY --chown=codeql:codeql package /home/codeql/package
WORKDIR /home/codeql/package
RUN npm install
RUN npm run build

ENTRYPOINT ["nodejs", "/home/codeql/package/build"]
