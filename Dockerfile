FROM node:14.16.1

LABEL com.github.actions.name="Parcel Benchmark Action"
LABEL com.github.actions.description="Measures performance impact of a PR"
LABEL repository="https://github.com/DeMoorJasper/parcel-benchmark-action"

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; rustc --version

WORKDIR /usr/src/app

COPY ./ ./

RUN make benchmarks/three/src
RUN yarn install
RUN yarn build

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
