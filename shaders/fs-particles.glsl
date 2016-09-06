#define PI  3.1415926535897932384626433832795
#define PI2 6.283185307179586

uniform sampler2D map;
varying vec2 vUv;

uniform float saturation;

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float atan2(in float y, in float x)
{
    if(x == 0.0)
        return sign(y)*PI/2.0;
    else if( x > 0.0){
        if(y>0.0){
    		return atan(y, x) - PI;
        }else{
            return atan(y, x) + PI;
        }
    }else{
        if(y>=0.0){
             return atan(y, x) + PI;
        }else{
            return atan(y, x) - PI;
        }
    }
}

void main() {

    vec3 res =  texture2D( map, vUv ).xyz;
    float opacity = clamp(1.0/(res.x*res.x + res.z*res.z), 0.25, 1.0 );
    float angle = atan2(res.z, res.x);
    angle = ((angle + PI))/PI2;
	vec3 hsv = vec3(angle, saturation, 1.0);
	vec3 rgb = hsv2rgb(hsv);

	gl_FragColor = vec4( rgb, opacity);
}
