FROM node:14.18.0

LABEL com.github.actions.name="Parcel Benchmark Action"
LABEL com.github.actions.description="Measures performance impact of a PR"
LABEL repository="https://github.com/DeMoorJasper/parcel-benchmark-action"

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    ca-certificates curl file \
    build-essential \
    autoconf automake autotools-dev libtool xutils-dev && \
    rm -rf /var/lib/apt/lists/*

ENV SSL_VERSION=1.0.2k

RUN curl https://www.openssl.org/source/openssl-$SSL_VERSION.tar.gz -O && \
    tar -xzf openssl-$SSL_VERSION.tar.gz && \
    cd openssl-$SSL_VERSION && ./config && make depend && make install && \
    cd .. && rm -rf openssl-$SSL_VERSION*

ENV OPENSSL_LIB_DIR=/usr/local/ssl/lib \
    OPENSSL_INCLUDE_DIR=/usr/local/ssl/include \
    OPENSSL_STATIC=1

RUN curl https://sh.rustup.rs -sSf | \
    sh -s -- --default-toolchain nightly -y

ENV PATH=/root/.cargo/bin:$PATH
ENV USER root

RUN rustc --version && cargo --version

WORKDIR /usr/src/app

COPY ./ ./

RUN make benchmarks/three/src
RUN yarn install
RUN yarn build

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
