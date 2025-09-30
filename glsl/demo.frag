#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution; // 画布尺寸（宽，高）
uniform vec2 u_mouse;      // 鼠标位置（在屏幕上哪个像素）
uniform float u_time;     // 时间（加载后的秒数）

#define PI 3.14159265359

float plot(vec2 st, float pct){
  // 这里的st是传入的坐标，pct是传入的y值
  // 函数创建一个围绕pct值的平滑曲线
  return  smoothstep( pct-0.01, pct, st.y) -
          smoothstep( pct, pct+0.01, st.y);
}

vec3 dynamicEffect(vec2 st) {
	// 使用未规范化的鼠标坐标来影响颜色
	vec2 mouseInfluence = u_mouse / u_resolution;
	
	// 创建一个基于鼠标位置和时间的动态效果
	vec2 center = mouseInfluence; // 鼠标位置作为中心点
	float dist = distance(st, center); // 计算当前像素到鼠标位置的距离
	
	// 使用时间变量创造动态变化
	float timeEffect = sin(u_time * 2.0) * 0.5 + 0.5;
	
	// 创建圆形渐变效果，中心点跟随鼠标
	float circle = smoothstep(0.1, 0.1 + 0.1 * timeEffect, dist);
	
	// 添加条纹效果
	float stripes = sin(st.y * 20.0 + u_time * 3.0) * 0.5 + 0.5;
	
	// 组合多种效果
	float red = st.x + mouseInfluence.x * 0.5 - circle * 0.3;
	float green = st.y + mouseInfluence.y * 0.5 + circle * stripes * 0.5;
	float blue = dist * 2.0 * timeEffect + mouseInfluence.x * mouseInfluence.y;
	
	return vec3(red, green, blue);
}

vec3 diagonalLine(vec2 st) {
    // 从黑道白渐变
    vec3 color = vec3(st.x);

    // 添加一条绿色的线，计算x，y的差值
    float pct = plot(st, st.x);
    color = (1.0-pct)*color+pct*vec3(0.0,1.0,0.0);
    
    return color;
}

vec3 turnerSunset(vec2 st, float time) {
    // 创建一个模拟William Turner风格落日的渐变
    vec3 color = vec3(0.0);
    
    // 天空基础色调 - 橙色到紫色的渐变
    vec3 skyTop = vec3(0.1, 0.05, 0.2);      // 深紫色
    vec3 skyMiddle = vec3(0.9, 0.4, 0.1);    // 橙色
    vec3 skyBottom = vec3(0.9, 0.7, 0.2);    // 金黄色
    
    // 根据y坐标混合天空颜色
    float y = st.y;
    if (y < 0.5) {
        float factor = y / 0.5;
        color = mix(skyBottom, skyMiddle, factor);
    } else {
        float factor = (y - 0.5) / 0.5;
        color = mix(skyMiddle, skyTop, factor);
    }
    
    // 添加太阳
    vec2 sunPos = vec2(0.5, 0.4 + 0.2 * sin(time)); // 太阳上下移动模拟日出日落
    float sunDist = distance(st, sunPos);
    float sun = smoothstep(0.2, 0.1, sunDist);
    vec3 sunColor = vec3(1.0, 0.8, 0.3);
    color = mix(color, sunColor, sun);
    
    // 添加云彩
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
    // 创建彩虹效果
    vec3 color = vec3(0.0);
    
    // 使用sin函数创建彩虹色带
    float red = sin(st.x * PI * 2.0 + 0.0) * 0.5 + 0.5;
    float green = sin(st.x * PI * 2.0 + 2.0) * 0.5 + 0.5;
    float blue = sin(st.x * PI * 2.0 + 4.0) * 0.5 + 0.5;
    
    color = vec3(red, green, blue);
    
    // 添加y方向的渐变效果
    color *= st.y;
    
    return color;
}

vec3 flag(vec2 st) {
    // 使用step函数创建五彩旗帜
    vec3 color = vec3(0.0);
    
    // 将画面分为5个水平条带
    float row = step(0.2, st.y) + step(0.4, st.y) + step(0.6, st.y) + step(0.8, st.y);
    
    // 为每个条带分配不同颜色
    if (row == 0.0) {
        color = vec3(1.0, 0.0, 0.0); // 红色
    } else if (row == 1.0) {
        color = vec3(1.0, 0.5, 0.0); // 橙色
    } else if (row == 2.0) {
        color = vec3(1.0, 1.0, 0.0); // 黄色
    } else if (row == 3.0) {
        color = vec3(0.0, 1.0, 0.0); // 绿色
    } else {
        color = vec3(0.0, 0.0, 1.0); // 蓝色
    }
    
    // 添加旗帜飘动效果
    float wave = sin(st.x * 10.0 + u_time * 2.0) * 0.02;
    float waveEffect = step(wave + 0.5, st.y) - step(wave + 0.52, st.y);
    if (waveEffect > 0.5) {
        color = vec3(1.0);
    }
    
    return color;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution;
    
    // 默认使用其中一个效果，或者可以通过其他方式切换
    // vec3 color = dynamicEffect(st);
    // vec3 color = diagonalLine(st);
    // vec3 color = turnerSunset(st, u_time);
    // vec3 color = rainbow(st);
    vec3 color = flag(st);
    
    gl_FragColor = vec4(color, 1.0);
}