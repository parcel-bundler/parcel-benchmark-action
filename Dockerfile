FROM node:12.10.0-alpine

LABEL com.github.actions.name="Parcel Benchmark Action"
LABEL com.github.actions.description="Measures performance impact of a PR"
LABEL repository="https://github.com/DeMoorJasper/parcel-benchmark-action"

WORKDIR /usr/src/app

COPY ./ ./

RUN yarn install
RUN yarn build-tsc

CMD [ "node", "./src/index.js" ]
