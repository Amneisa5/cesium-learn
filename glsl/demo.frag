#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution; // Canvas dimensions (width, height)
uniform vec2 u_mouse;      // Mouse position (which pixel on screen)
uniform float u_time;     // Time (seconds since load)

#define PI 3.14159265359

float plot(vec2 st, float pct){
  // This function creates a smooth curve around the pct value
  // It's used to draw thin lines or plots in our visualization
  return  smoothstep( pct-0.01, pct, st.y) -
          smoothstep( pct, pct+0.01, st.y);
}

vec3 dynamicEffect(vec2 st) {
	// Uses unnormalized mouse coordinates to influence colors
	vec2 mouseInfluence = u_mouse / u_resolution;
	
	// Creates a dynamic effect based on mouse position and time
	vec2 center = mouseInfluence; // Mouse position as center point
	float dist = distance(st, center); // Distance from current pixel to mouse
	
	// Uses time variable to create dynamic changes
	float timeEffect = sin(u_time * 2.0) * 0.5 + 0.5;
	
	// Creates circular gradient effect, center follows mouse
	float circle = smoothstep(0.1, 0.1 + 0.1 * timeEffect, dist);
	
	// Adds stripe effect
	float stripes = sin(st.y * 20.0 + u_time * 3.0) * 0.5 + 0.5;
	
	// Combines multiple effects for RGB components
	float red = st.x + mouseInfluence.x * 0.5 - circle * 0.3;
	float green = st.y + mouseInfluence.y * 0.5 + circle * stripes * 0.5;
	float blue = dist * 2.0 * timeEffect + mouseInfluence.x * mouseInfluence.y;
	
	return vec3(red, green, blue);
}

vec3 diagonalLine(vec2 st) {
    // Creates gradient from black to white
    vec3 color = vec3(st.x);

    // Adds a green line by calculating difference between x and y
    float pct = plot(st, st.x);
    color = (1.0-pct)*color+pct*vec3(0.0,1.0,0.0);
    
    return color;
}

vec3 turnerSunset(vec2 st, float time) {
    // Creates a William Turner style sunset gradient simulation
    vec3 color = vec3(0.0);
    
    // Sky base tone - gradient from orange to purple
    vec3 skyTop = vec3(0.1, 0.05, 0.2);      // Deep purple
    vec3 skyMiddle = vec3(0.9, 0.4, 0.1);    // Orange
    vec3 skyBottom = vec3(0.9, 0.7, 0.2);    // Golden yellow
    
    // Blends sky colors based on Y coordinate
    float y = st.y;
    if (y < 0.5) {
        float factor = y / 0.5;
        color = mix(skyBottom, skyMiddle, factor);
    } else {
        float factor = (y - 0.5) / 0.5;
        color = mix(skyMiddle, skyTop, factor);
    }
    
    // Adds sun
    vec2 sunPos = vec2(0.5, 0.4 + 0.2 * sin(time)); // Sun moves up/down simulating sunrise/sunset
    float sunDist = distance(st, sunPos);
    float sun = smoothstep(0.2, 0.1, sunDist);
    vec3 sunColor = vec3(1.0, 0.8, 0.3);
    color = mix(color, sunColor, sun);
    
    // Adds clouds
    float cloud = 0.0;
    for (float i = 0.0; i < 5.0; i++) {
        vec2 cloudPos = vec2(0.2 + i * 0.2, 0.6 + 0.1 * sin(time + i));
        float cloudDist = distance(st, cloudPos);
        cloud += smoothstep(0.15, 0.05, cloudDist) * 0.5;
    }
    color = mix(color, vec3(1.0), cloud);
    
    return color;
}

vec3 rainbow(vec2 st) {
    // Creates rainbow effect
    vec3 color = vec3(0.0);
    
    // Uses sin function to create rainbow color bands
    float red = sin(st.x * PI * 2.0 + 0.0) * 0.5 + 0.5;
    float green = sin(st.x * PI * 2.0 + 2.0) * 0.5 + 0.5;
    float blue = sin(st.x * PI * 2.0 + 4.0) * 0.5 + 0.5;
    
    color = vec3(red, green, blue);
    
    // Adds gradient effect in Y direction
    color *= st.y;
    
    return color;
}

vec3 flag(vec2 st) {
    // Uses step function to create colorful flag
    vec3 color = vec3(0.0);
    
    // Divides canvas into 5 horizontal bands
    float row = step(0.2, st.y) + step(0.4, st.y) + step(0.6, st.y) + step(0.8, st.y);
    
    // Assigns different color to each band
    if (row == 0.0) {
        color = vec3(1.0, 0.0, 0.0); // Red
    } else if (row == 1.0) {
        color = vec3(1.0, 0.5, 0.0); // Orange
    } else if (row == 2.0) {
        color = vec3(1.0, 1.0, 0.0); // Yellow
    } else if (row == 3.0) {
        color = vec3(0.0, 1.0, 0.0); // Green
    } else {
        color = vec3(0.0, 0.0, 1.0); // Blue
    }
    
    // Adds waving flag effect
    float wave = sin(st.x * 10.0 + u_time * 2.0) * 0.02;
    float waveEffect = step(wave + 0.5, st.y) - step(wave + 0.52, st.y);
    if (waveEffect > 0.5) {
        color = vec3(1.0);
    }
    
    return color;
}

// void main() {
//     vec2 st = gl_FragCoord.xy/u_resolution;
    
//     // Default uses one of the effects, or can be switched via other means
//     // vec3 color = dynamicEffect(st);
//     // vec3 color = diagonalLine(st);
//     // vec3 color = turnerSunset(st, u_time);
//     vec3 color = rainbow(st);
//     // vec3 color = flag(st);
    
//     gl_FragColor = vec4(color, 0.5);
// }

// void main() {
//     vec2 st = gl_FragCoord.xy/u_resolution.xy;
//     float aspect = u_resolution.x/u_resolution.y;
//     if (aspect > 1.0) {
//         st.x *= aspect;
//     } else {
//         st.y /= aspect;
//     }

//     // Initialize color vector
//     vec3 color = vec3(0.);
    
//     // Creates a gradient where:
//     // Red component increases from left to right
//     // Green component increases from bottom to top
//     // Blue component oscillates over time (creates animation)
//     color = vec3(st.x, st.y, abs(sin(u_time)));

//     // Sets the final pixel color with full opacity
//     gl_FragColor = vec4(color,1.0);
// }

void main() {
    // 屏幕坐标归一化 [0,1]
    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    // 调整到 [-1,1] 区间，以屏幕中心为原点
    st = st * 2.0 - 1.0;

    // 没有修正的坐标
    vec2 st_no_fix = st;

    // 有修正的坐标
    float aspect = u_resolution.x / u_resolution.y;
    vec2 st_fix = st;
    if (aspect > 1.0) {
        st_fix.x *= aspect;
    } else {
        st_fix.y /= aspect;
    }

    // 画圆 (半径 0.5)
    float d_no_fix = length(st_no_fix);
    float d_fix    = length(st_fix);

    // 分屏显示：左边无修正，右边有修正
    vec3 color = vec3(0.0);
    if (gl_FragCoord.x < u_resolution.x * 0.5) {
        // 左半屏：未修正 → 椭圆
        color = d_no_fix < 0.5 ? vec3(0.2, 0.6, 1.0) : vec3(0.0);
    } else {
        // 右半屏：修正后 → 正圆
        color = d_fix < 0.5 ? vec3(1.0, 0.5, 0.2) : vec3(0.0);
    }

    gl_FragColor = vec4(color, 1.0);
}