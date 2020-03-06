github/three:
	mkdir -p github
	git clone --depth 1 --branch r108 https://github.com/mrdoob/three.js.git github/three

benchmarks/three: | github/three
	mkdir -p benchmarks/three
	echo > benchmarks/three/entry.js
	echo '{ "extends": "@parcel/config-default", "reporters": ["...", "@parcel/reporter-build-metrics"] }' >> benchmarks/three/.parcelrc
	echo '{ "name": "@parcel/three-js-benchmark", "version": "1.0.0", "source": "entry.js" }' >> benchmarks/three/package.json
	for i in 1 2 3 4 5 6 7 8 9 10; do test -d "benchmarks/three/copy$$i" || cp -r github/three/src "benchmarks/three/copy$$i"; done
	for i in 1 2 3 4 5 6 7 8 9 10; do echo "import * as copy$$i from './copy$$i/Three.js'; export {copy$$i}" >> benchmarks/three/entry.js; done
	echo 'Line count:' && find benchmarks/three -name '*.js' | xargs wc -l | tail -n 1
	