#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution; // 画布尺寸（宽，高）
uniform vec2 u_mouse;      // 鼠标位置（在屏幕上哪个像素）
uniform float u_time;     // 时间（加载后的秒数）

#define PI 3.14159265359

// void main() {
// 	// gl_FragCoord像素的坐标
// 	vec2 st = gl_FragCoord.xy / u_resolution;
	
// 	// 使用未规范化的鼠标坐标来影响颜色
// 	vec2 mouseInfluence = u_mouse / u_resolution;
	
// 	// 创建一个基于鼠标位置和时间的动态效果
// 	vec2 center = mouseInfluence; // 鼠标位置作为中心点
// 	float dist = distance(st, center); // 计算当前像素到鼠标位置的距离
	
// 	// 使用时间变量创造动态变化
// 	float timeEffect = sin(u_time * 2.0) * 0.5 + 0.5;
	
// 	// 创建圆形渐变效果，中心点跟随鼠标
// 	float circle = smoothstep(0.1, 0.1 + 0.1 * timeEffect, dist);
	
// 	// 添加条纹效果
// 	float stripes = sin(st.y * 20.0 + u_time * 3.0) * 0.5 + 0.5;
	
// 	// 组合多种效果
// 	float red = st.x + mouseInfluence.x * 0.5 - circle * 0.3;
// 	float green = st.y + mouseInfluence.y * 0.5 + circle * stripes * 0.5;
// 	float blue = dist * 2.0 * timeEffect + mouseInfluence.x * mouseInfluence.y;
	
// 	gl_FragColor = vec4(red, green, blue, 0.2);
// }

// float plot(vec2 st) {    
// 	return smoothstep(0.02, 0.0, abs(st.y - st.x));
// }

// void main(){
// 	vec2 st = gl_FragCoord.xy/u_resolution;

// 	// 从黑道白渐变
// 	vec3 color = vec3(st.x);

// 	// 添加一条绿色的线，计算x，y的差值
// 	float pct = plot(st);
// 	color = (1.0-pct)*color+pct*vec3(0.0,1.0,0.0);

// 	gl_FragColor = vec4(color,1.0);
// }


float plot(vec2 st, float pct){
  // 这里的st是传入的坐标，pct是传入的y值
  // 函数创建一个围绕pct值的平滑曲线
  return  smoothstep( pct-0.01, pct, st.y) -
          smoothstep( pct, pct+0.01, st.y);
}

// void main() {
//     vec2 st = gl_FragCoord.xy/u_resolution;
    
//     // 示例exp和log函数
//     float exp_val = (exp(st.x) - 1.0) / (2.718281828 - 1.0); // 归一化exp函数值到[0,1]范围
//     float log_val = st.x > 0.0 ? (log(st.x + 0.001) + 6.908) / 6.908 : 0.0; // 处理log(0)的情况并归一化
    
//     // 可视化exp函数（红色）
//     vec3 color = vec3(0.0);
//     float pct1 = plot(st, exp_val);
//     color += pct1 * vec3(1.0, 0.0, 0.0);
    
//     // 可视化log函数（蓝色）
//     float pct2 = plot(st, log_val);
//     color += pct2 * vec3(0.0, 0.0, 1.0);
    
//     // 添加对角线参考线（灰色）
//     float pct3 = plot(st, st.x);
//     color += pct3 * vec3(0.5, 0.5, 0.5) * 0.5;

//     gl_FragColor = vec4(color, 1.0);
// }

vec3 colorA = vec3(0.149,0.141,0.912);
vec3 colorB = vec3(1.000,0.833,0.224);
void main() { 
	vec2 st = gl_FragCoord.xy/u_resolution.xy;
	vec3 color = vec3(0.0);

	vec3 pct = vec3(st.x);
 	pct.r = smoothstep(0.0,1.0, st.x);
	pct.g = sin(st.x*PI);
	pct.b = pow(st.x,0.5);
 	color = mix(colorA, colorB, pct);

    // Plot transition lines for each channel
	color = mix(color,vec3(1.0,0.0,0.0),plot(st,pct.r));
	color = mix(color,vec3(0.0,1.0,0.0),plot(st,pct.g));
	color = mix(color,vec3(0.0,0.0,1.0),plot(st,pct.b));

	gl_FragColor = vec4(color,0.5);
}