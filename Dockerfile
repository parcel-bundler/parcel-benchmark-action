FROM node:22.4-bullseye

LABEL com.github.actions.name="Parcel Benchmark Action"
LABEL com.github.actions.description="Measures performance impact of a pull request"
LABEL repository="https://github.com/parcel-bundler/parcel-benchmark-action"

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    ca-certificates curl file \
    build-essential \
    autoconf automake autotools-dev libtool xutils-dev && \
    rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | \
    sh -s -- --default-toolchain stable -y

ENV PATH=/root/.cargo/bin:$PATH
ENV USER root

RUN rustc --version && cargo --version

WORKDIR /usr/src/app

COPY ./ ./

RUN make benchmarks/three/src
RUN yarn install
RUN yarn build

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
