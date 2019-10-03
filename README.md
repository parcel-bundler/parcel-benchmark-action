# Parcel benchmark action

Benchmark API Repo: [DeMoorJasper/parcel-benchmark-api](https://github.com/DeMoorJasper/parcel-benchmark-api)

This is an experimental GitHub Action for testing Parcel's performance and bundle size on a couple demo applications to automatically measure and report performance impact of PRs on these examples.

This can also be extended in the future to automatically report performance comparison with other bundling tools for each release.

## Wanna help out?

Any contributions are welcome from new benchmark applications to code improvements. Have a look at the issues to get a feel of which features and benchmarks are currently most wanted.

### Adding benchmarks

To create a new benchmark application, create a new folder in the benchmarks folder similar to existing benchmark applications in this folder.

The only requirement for a benchmark is that it cannot contain any third party Parcel plugins, as these aren't maintained by the Parcel core team and are not very useful for testing Parcel's core performance.
