var audio, context, source, analyser, 
analyserDataArray = new Int32Array(256),
freqDataArray  = null,
timeDataArray = null,
TOTAL_BANDS = 256,
amplitude = 0;

var container;

var scene, camera, light, renderer;
var geometry, cube, mesh, material;

var data, texture, points;

var controls;

var fboParticles, rtTexturePos, rtTexturePos2, simulationShader;

initGL();
initAL();
animate();

function initAL() {
    audio = document.createElement('audio');
    //audio.src = "audio/Mitis - Endeavors.mp3";
    audio.src = "audio/feel_better.mp3";
    audio.loop = 1;
    audio.pause();
    
    context = new (window.AudioContext || window.webkitAudioContext)()
    analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.1

    audio.addEventListener('canplay', function() {
      if(source)
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

    document.body.appendChild( stats.domElement );
  

    container = document.createElement('div');
    document.body.appendChild(container);
    
    renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,1,2000);
    camera.position.z = 520;
    camera.position.y = 130;
    camera.position.x = 300;
        
    scene.add(camera);
    camera.lookAt(new THREE.Vector3(0,0,0));
    
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
        }

    }

    var _s = settings.HIGH;
    
    var width = _s.width, 
        height = _s.height,
        pointSize = _s.pointSize;
    var totalSize = width * height;
    
    if (!renderer.context.getExtension('OES_texture_float')) {    
        alert('OES_texture_float is not :(');
    }
       
    data = new Float32Array(totalSize * 3);
    
    for (var i = 0, j = 0, angle=0, l = data.length; i < l; i += 3, j += 1) {
        angle = Math.PI * 2 * i /data.length;
        data[i] = Math.sin(angle); 
        data[i + 1] = 0;
        data[i + 2] = Math.cos(angle);
    }

    
    texture = new THREE.DataTexture(data,width,height,THREE.RGBFormat,THREE.FloatType);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    
    // zz85 - fbo init
    
    rtTexturePos = new THREE.WebGLRenderTarget(width,height,{
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
            amplitude:{
                type: 'f',
                value: amplitude
            }
        },
        
        vertexShader: document.getElementById('texture_vertex_simulation_shader').textContent,
        fragmentShader: document.getElementById('texture_fragment_simulation_shader').textContent
    
    });
    
    fboParticles = new THREE.FBOUtils(width,renderer,simulationShader);
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
                value: pointSize
            }
        
        },
        vertexShader: document.getElementById('vs-particles').textContent,
        fragmentShader: document.getElementById('fs-particles').textContent,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true
    
    });
    
    mesh = new THREE.PointCloud(geometry,material);
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
    amplitude = 0;
    if (freqDataArray) {
      analyser.getByteFrequencyData(freqDataArray);
      analyser.getByteTimeDomainData(timeDataArray);
      for(var i =0; i< freqDataArray.length; i++){
          analyserDataArray[i] = timeDataArray[i];
          amplitude += freqDataArray[i];
      }
      amplitude /= TOTAL_BANDS*256;
      simulationShader.uniforms.amplitude.value = 2*amplitude;
    }
    
    timer += 0.01;
    simulationShader.uniforms.timer.value = timer;
    
    
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
