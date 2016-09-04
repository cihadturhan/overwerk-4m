uniform sampler2D map;

uniform float width;
uniform float height;

uniform float pointSize;

varying vec2 vUv;

void main() {

    vUv = position.xy + vec2( 0.5 / width, 0.5 / height );

    vec3 color = texture2D( map, vUv ).rgb * 50.0;

    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( color, 1.0 );
    //gl_Position = projectionMatrix * modelViewMatrix * vec4( position * 200.0  - vec3(100.0, 100.0, 0.0) , 1.0 );
    
}