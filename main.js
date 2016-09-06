var audio, context, source, analyser,
    analyserDataArray = new Int32Array(128),
    freqDataArray = null,
    timeDataArray = null,
    pointSize = 1,
    TOTAL_BANDS = analyserDataArray.length;

var guiControls = {
    amplitude : 0.5,
    maxHeight: 1.0,
    saturation: 0.9,
    noiseConstant: 0.02,
    pointSize: 1.0,
    lifetime: 0.08
}

var shaders = {};

var container;

var scene, camera, light, renderer;
var geometry, cube, mesh, material;

var data, texture, points;

var controls;

var fboParticles, rtTexturePos, rtTexturePos2, simulationShader;

function initAL() {
    audio = document.createElement('audio');
    //audio.src = "audio/Mitis - Endeavors.mp3";
    // daybreak endeavors feel_better move paradise Toccata unity
    audio.src = "audio/Toccata.mp3";
    audio.loop = 1;
    audio.play();

    context = new(window.AudioContext || window.webkitAudioContext)()
    analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.3

    audio.addEventListener('canplay', function() {
        if (source)
            return;

        var bufferLength;
        console.log('audio canplay');

        source = context.createMediaElementSource(audio);
        source.connect(analyser);
        source.connect(context.destination);
        analyser.fftSize = TOTAL_BANDS * 2;
        bufferLength = analyser.frequencyBinCount;
        freqDataArray = new Uint8Array(bufferLength);
        timeDataArray = new Uint8Array(bufferLength);
    });

}

function initGL() {

    stats = new Stats();

    stats.domElement.style.position = 'absolute',
        stats.domElement.style.left = '0px',
        stats.domElement.style.top = '0px',
        stats.domElement.style.zIndex = 204;

    document.body.appendChild(stats.domElement);


    container = document.createElement('div');
    document.body.appendChild(container);

    renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 520;
    camera.position.y = 130;
    camera.position.x = 300;

    scene.add(camera);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    controls = new THREE.TrackballControls(camera, container);
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 100;
    controls.maxDistance = 1000;
    controls.dynamicDampingFactor = 0.1;

    var settings = {
        HIGHEST: {
            width: 2048,
            height: 2048,
            pointSize: 1
        },
        HIGH: {
            width: 1024,
            height: 2048,
            pointSize: 1
        },
        MEDIUM: {
            width: 1024,
            height: 1024,
            pointSize: 2
        },
        LOW: {
            width: 512,
            height: 512,
            pointSize: 3
        },
        LOWEST: {
            width: 256,
            height: 256,
            pointSize: 4
        },
        MINIMAL: {
            width: 4,
            height: 4,
            pointSize: 10
        }

    }

    var settingsHash = window.location.hash.replace('#', '');

    var _s = settings[settingsHash];
    if (!_s)
        _s = settings.MEDIUM;

    var width = _s.width,
        height = _s.height;
    pointSize = _s.pointSize;
    var totalSize = width * height;

    if (!renderer.context.getExtension('OES_texture_float')) {
        alert('OES_texture_float is not :(');
    }

    data = new Float32Array(totalSize * 3);

    for (var i = 0, j = 0, angle = 0, l = data.length; i < l; i += 3, j += 1) {
        angle = Math.PI * 2 * i / data.length;
        data[i] = Math.sin(angle);
        data[i + 1] = 0;
        data[i + 2] = Math.cos(angle);
    }


    texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    // zz85 - fbo init

    rtTexturePos = new THREE.WebGLRenderTarget(width, height, {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBFormat,
        type: THREE.FloatType,
        stencilBuffer: false
    });

    rtTexturePos2 = rtTexturePos.clone();

    simulationShader = new THREE.ShaderMaterial({

        uniforms: {
            tPositions: {
                type: "t",
                value: texture
            },
            audioData: {
                type: "iv1",
                value: analyserDataArray
            },
            origin: {
                type: "t",
                value: texture
            },
            timer: {
                type: "f",
                value: 0
            },
            amplitude: {
                type: 'f',
                value: guiControls.amplitude
            },
            maxHeight: {
                type: 'f',
                value: guiControls.maxHeight
            },
            noiseConstant: {
                type: 'f',
                value: guiControls.noiseConstant
            },
            lifetime: {
                type: 'f',
                value: guiControls.lifetime
            }
        },

        vertexShader: shaders['texture_vertex_simulation_shader'],
        fragmentShader: shaders['texture_fragment_simulation_shader']

    });

    fboParticles = new THREE.FBOUtils(width, renderer, simulationShader);
    fboParticles.renderToTexture(rtTexturePos, rtTexturePos2);

    fboParticles.in = rtTexturePos;
    fboParticles.out = rtTexturePos2;


    geometry = new THREE.Geometry();

    for (var i = 0, l = width * height; i < l; i++) {

        var vertex = new THREE.Vector3();
        vertex.x = (i % width) / width;
        vertex.y = Math.floor(i / width) / height;
        geometry.vertices.push(vertex);

    }

    material = new THREE.ShaderMaterial({

        uniforms: {

            "map": {
                type: "t",
                value: rtTexturePos
            },
            "width": {
                type: "f",
                value: width
            },
            "height": {
                type: "f",
                value: height
            },
            "pointSize": {
                type: "f",
                value: pointSize * guiControls.pointSize
            },
            "saturation": {
                type: "f",
                value: guiControls.saturation
            }

        },
        vertexShader: shaders['vs-particles'],
        fragmentShader: shaders['fs-particles'],
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true

    });

    mesh = new THREE.PointCloud(geometry, material);
    scene.add(mesh);

}

function animate() {
    requestAnimationFrame(animate);

    stats.begin();
    render();
    stats.end();

}

var timer = 0;

function render() {
    var amplitude = 0;
    if (freqDataArray) {
        analyser.getByteFrequencyData(freqDataArray);
        analyser.getByteTimeDomainData(timeDataArray);

        for (var i = 0; i < freqDataArray.length; i++) {
            analyserDataArray[i] = timeDataArray[i];
            amplitude += freqDataArray[i];
        }

        amplitude /= 256 * analyserDataArray.length / 2;
        guiControls.amplitude = amplitude;
    }

    timer += 0.01;
    simulationShader.uniforms.timer.value = timer;
    simulationShader.uniforms.amplitude.value = guiControls.amplitude;

    // swap
    var tmp = fboParticles.in;
    fboParticles.in = fboParticles.out;
    fboParticles.out = tmp;

    simulationShader.uniforms.tPositions.value = fboParticles.in;
    fboParticles.simulate(fboParticles.out);
    material.uniforms.map.value = fboParticles.out;

    controls.update();

    renderer.render(scene, camera);

}

function initGUI(){
    var gui = new dat.GUI();

    gui.add(audio, 'volume', 0, 1);
    gui.add(analyser, 'smoothingTimeConstant', 0, 1);
    
    gui.add(guiControls, 'maxHeight', -1, 3, 0.05).onChange(function(newValue){
        simulationShader.uniforms.maxHeight.value = newValue;
    });
    gui.add(guiControls, 'noiseConstant', 0.005, 0.035, 0.006).onChange(function(newValue){
        simulationShader.uniforms.noiseConstant.value = newValue;
    });
    gui.add(guiControls, 'lifetime', 0.020, 0.098, 0.001).onChange(function(newValue){
        simulationShader.uniforms.lifetime.value = newValue;
    });

    gui.add(guiControls, 'saturation', 0.0, 1, 0.1).onChange(function(newValue){
        material.uniforms.saturation.value = newValue;
    });

    gui.add(guiControls, 'pointSize', 0.1, 3, 1).onChange(function(newValue){
        material.uniforms.pointSize.value = newValue* pointSize;
    });

    gui.add(guiControls, 'amplitude', 0, 1, 0.05).listen();

    /*gui.add(text, 'displayOutline');
    gui.add(text, 'explode');*/
}


$().ready(function() {
    var ShaderFiles = [
        'texture_vertex_simulation_shader',
        'texture_fragment_simulation_shader',
        'vs-particles',
        'fs-particles'
    ]

    var deferreds = ShaderFiles.map(function(s) {
        return $.get('shaders/' + s + '.glsl');
    });


    $.when.apply($, deferreds).done(function() {
        Array.prototype.forEach.call(arguments, function(d, i) {
            shaders[ShaderFiles[i]] = d[0];
        })

        initAL();
        initGL();
        animate();

        initGUI();

    });

    


})
