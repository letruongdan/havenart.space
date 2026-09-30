#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

// Quiet, subtle, organic ambient shader for Haven Art
// Generates a meditative, slowly breathing backdrop with warm serene tones
void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0, 1.0));
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = uv;
  p.x *= aspect;

  // Ultra-slow, peaceful breathing time factor
  float t = u_time * 0.04;

  // Multi-layered organic undulating wave contours
  float wave1 = sin(p.x * 1.8 + t + sin(p.y * 2.2 + t * 0.6));
  float wave2 = cos(p.y * 2.0 - t * 0.7 + cos(p.x * 1.6 + t * 0.5));
  float wave3 = sin((p.x + p.y) * 1.5 + t * 0.9);

  // Soft normalization to [0.0, 1.0]
  float blend = (wave1 + wave2 + wave3) / 3.0;
  blend = smoothstep(-0.8, 0.8, blend);

  // Haven Art serene palette:
  // Light sand/linen base: #fbf9f5 -> rgb(0.984, 0.976, 0.961)
  // Soft morning mist:     #e8edea -> rgb(0.910, 0.929, 0.918)
  // Warm golden amber:     #f4ece1 -> rgb(0.957, 0.925, 0.882)
  vec3 colBase = vec3(0.984, 0.976, 0.961);
  vec3 colMist = vec3(0.910, 0.929, 0.918);
  vec3 colAmber = vec3(0.957, 0.925, 0.882);

  vec3 col = mix(colBase, colMist, blend);
  float accentFactor = sin(t * 0.5 + uv.y * 1.5) * 0.15 + 0.15;
  col = mix(col, colAmber, accentFactor);

  fragColor = vec4(col, 1.0);
}
