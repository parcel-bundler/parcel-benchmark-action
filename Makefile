github/three:
	mkdir -p github
	git clone --depth 1 --branch r108 https://github.com/mrdoob/three.js.git github/three

benchmarks/three: | github/three
	cp -r github/three/src "benchmarks/three/src"
	echo 'Line count:' && find benchmarks/three -name '*.js' | xargs wc -l | tail -n 1
	