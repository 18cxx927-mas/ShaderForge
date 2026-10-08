/**
 * Comprehensive GLSL Shader Snippets Library
 * Categories: Noise & Procedural, Lighting Calculations, Color & Tonemapping,
 * Coordinate Transformations, and Minecraft Iris Specials.
 */

export interface GlslSnippet {
  id: string;
  title: string;
  category: 'noise' | 'lighting' | 'color' | 'transform' | 'minecraft' | 'math';
  description: string;
  tags: string[];
  inputs: string;
  output: string;
  code: string;
}

export const GLSL_SNIPPETS_LIBRARY: GlslSnippet[] = [
  // ==========================================
  // 1. NOISE & PROCEDURAL FUNCTIONS
  // ==========================================
  {
    id: 'noise_simplex_2d',
    title: '2D Simplex Noise',
    category: 'noise',
    description: 'High performance analytic 2D Simplex Noise. Returns values in range [-1.0, 1.0]. Perfect for terrain, water surfaces, and smoke.',
    tags: ['noise', 'simplex', 'procedural', 'smooth', 'terrain'],
    inputs: 'vec2 p',
    output: 'float (-1.0 to 1.0)',
    code: `// 2D Simplex Noise
vec3 _mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 _mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 _permute(vec3 x) { return _mod289(((x * 34.0) + 1.0) * x); }

float snoise2D(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = _mod289(i);
    vec3 p = _permute(_permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
`
  },
  {
    id: 'noise_fbm_octaves',
    title: 'Fractional Brownian Motion (fBm)',
    category: 'noise',
    description: 'Multi-octave layered turbulence noise combining multiple frequencies. Ideal for clouds, marble, terrain elevation, and fire.',
    tags: ['noise', 'fbm', 'fractal', 'clouds', 'turbulence', 'octaves'],
    inputs: 'vec2 p, int octaves',
    output: 'float (0.0 to 1.0)',
    code: `// Hash helper for fBm
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D Value Noise
float valueNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Fractional Brownian Motion (fBm)
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        value += amplitude * valueNoise2D(p * frequency);
        p = rot * p * 2.0;
        amplitude *= 0.5;
    }
    return value;
}
`
  },
  {
    id: 'noise_voronoi_cellular',
    title: 'Voronoi / Worley Cellular Noise',
    category: 'noise',
    description: 'Cellular distance noise producing organic cell boundaries. Perfect for water caustics, cracked earth, cobblestone, and dragon scales.',
    tags: ['noise', 'voronoi', 'worley', 'cellular', 'water', 'caustics'],
    inputs: 'vec2 uv',
    output: 'vec2 (distToCenter, cellID)',
    code: `// Voronoi Cellular Noise
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float voronoi(vec2 uv) {
    vec2 n = floor(uv);
    vec2 f = fract(uv);
    float minDist = 8.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            // Optional animation with time: o = 0.5 + 0.5 * sin(frameTimeCounter + 6.2831 * o);
            vec2 r = g - f + o;
            float d = dot(r, r);
            if (d < minDist) {
                minDist = d;
            }
        }
    }
    return sqrt(minDist);
}
`
  },
  {
    id: 'noise_gradient_3d',
    title: '3D Gradient Noise',
    category: 'noise',
    description: 'Volumetric 3D gradient noise for atmospheric effects, volumetric fog, voxel density fields, and 3D clouds.',
    tags: ['noise', '3d', 'gradient', 'volume', 'fog', 'clouds'],
    inputs: 'vec3 pos',
    output: 'float (-1.0 to 1.0)',
    code: `// 3D Gradient Noise
vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
}

float gradientNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
                       dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}
`
  },

  // ==========================================
  // 2. LIGHTING & SHADING CALCULATIONS
  // ==========================================
  {
    id: 'lighting_blinn_phong',
    title: 'Blinn-Phong Specular Highlight',
    category: 'lighting',
    description: 'Calculates realistic specular reflections using halfway vector between view direction and light source.',
    tags: ['lighting', 'specular', 'blinn', 'phong', 'highlight', 'reflection'],
    inputs: 'vec3 normal, vec3 lightDir, vec3 viewDir, float shininess',
    output: 'float (specular coefficient)',
    code: `// Blinn-Phong Specular Highlight
float calculateBlinnPhong(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
    vec3 N = normalize(normal);
    vec3 L = normalize(lightDir);
    vec3 V = normalize(viewDir);
    vec3 H = normalize(L + V); // Halfway vector
    
    float NdotL = max(dot(N, L), 0.0);
    if (NdotL <= 0.0) return 0.0;
    
    float NdotH = max(dot(N, H), 0.0);
    return pow(NdotH, shininess) * NdotL;
}
`
  },
  {
    id: 'lighting_fresnel_schlick',
    title: 'Fresnel Factor (Schlick Approximation)',
    category: 'lighting',
    description: 'Calculates the Fresnel reflectance angle factor. Essential for glass, water, metallic surfaces, and rim lighting.',
    tags: ['lighting', 'fresnel', 'schlick', 'water', 'reflection', 'rim'],
    inputs: 'vec3 normal, vec3 viewDir, float f0',
    output: 'float (reflection strength 0.0 to 1.0)',
    code: `// Schlick Fresnel Approximation
float calculateFresnel(vec3 normal, vec3 viewDir, float f0) {
    float NdotV = max(dot(normalize(normal), normalize(viewDir)), 0.0);
    return f0 + (1.0 - f0) * pow(clamp(1.0 - NdotV, 0.0, 1.0), 5.0);
}

// Rim Light Glow
float calculateRimLight(vec3 normal, vec3 viewDir, float power) {
    float NdotV = max(dot(normalize(normal), normalize(viewDir)), 0.0);
    return pow(clamp(1.0 - NdotV, 0.0, 1.0), power);
}
`
  },
  {
    id: 'lighting_half_lambert',
    title: 'Wrapped Diffuse (Half-Lambert)',
    category: 'lighting',
    description: 'Soft wrapped diffuse shading popularized by Valve. Softens shadow terminators on curved foliage and skin.',
    tags: ['lighting', 'diffuse', 'lambert', 'half-lambert', 'soft-shadow'],
    inputs: 'vec3 normal, vec3 lightDir, float wrap',
    output: 'float (soft diffuse)',
    code: `// Half-Lambert / Wrapped Diffuse Lighting
float calculateHalfLambert(vec3 normal, vec3 lightDir, float wrap) {
    float NdotL = dot(normalize(normal), normalize(lightDir));
    // Re-map dot product: wrap = 0.5 is classic Half-Lambert
    return pow(max(0.0, (NdotL + wrap) / (1.0 + wrap)), 2.0);
}
`
  },
  {
    id: 'lighting_pbr_cook_torrance',
    title: 'PBR Microfacet Specular (GGX)',
    category: 'lighting',
    description: 'Physically Based Rendering (PBR) Cook-Torrance GGX microfacet distribution model for modern AAA shaderpacks.',
    tags: ['lighting', 'pbr', 'ggx', 'cook-torrance', 'specular', 'roughness'],
    inputs: 'vec3 N, vec3 V, vec3 L, float roughness, float F0',
    output: 'vec3 (PBR Specular term)',
    code: `// GGX Normal Distribution Function
float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = 3.14159265 * denom * denom;
    return num / max(denom, 0.00001);
}

// Geometry Smith Function
float geometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
}
`
  },

  // ==========================================
  // 3. COLOR & TONEMAPPING
  // ==========================================
  {
    id: 'color_aces_tonemap',
    title: 'ACES Film Tonemapping',
    category: 'color',
    description: 'Industry-standard Academy Color Encoding System (ACES) film tonemapper with high dynamic range roll-off.',
    tags: ['color', 'tonemap', 'aces', 'hdr', 'cinematic', 'film'],
    inputs: 'vec3 hdrColor',
    output: 'vec3 (LDR 0.0 to 1.0)',
    code: `// ACES Film Tone Mapping Curve (Narkowicz fit)
vec3 tonemapACES(vec3 color) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}
`
  },
  {
    id: 'color_reinhard_extended',
    title: 'Extended Reinhard Tonemapping',
    category: 'color',
    description: 'Extended Reinhard operator that maps a chosen maximum white luminance safely to 1.0 without crushing contrast.',
    tags: ['color', 'tonemap', 'reinhard', 'hdr', 'exposure'],
    inputs: 'vec3 hdrColor, float maxWhite',
    output: 'vec3 (LDR color)',
    code: `// Extended Reinhard Tonemapper
vec3 tonemapReinhardExtended(vec3 color, float maxWhite) {
    vec3 numerator = color * (1.0 + (color / (maxWhite * maxWhite)));
    return numerator / (1.0 + color);
}
`
  },
  {
    id: 'color_rgb_hsv',
    title: 'RGB <-> HSV Color Conversion',
    category: 'color',
    description: 'Fast branchless conversion between RGB color space and Hue-Saturation-Value (HSV) representation.',
    tags: ['color', 'rgb', 'hsv', 'hue', 'saturation', 'grading'],
    inputs: 'vec3 rgb / vec3 hsv',
    output: 'vec3',
    code: `// RGB to HSV Conversion
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV to RGB Conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`
  },
  {
    id: 'color_saturation_vibrance',
    title: 'Saturation & Contrast Adjustment',
    category: 'color',
    description: 'Photographic saturation and contrast grading using standard Rec.709 relative luminance weights.',
    tags: ['color', 'saturation', 'contrast', 'grade', 'vibrance'],
    inputs: 'vec3 color, float sat, float con',
    output: 'vec3',
    code: `// Color Grade: Saturation and Contrast
vec3 adjustSaturationAndContrast(vec3 color, float saturation, float contrast) {
    // Rec.709 Luminance
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 satColor = mix(vec3(luminance), color, saturation);
    // Contrast pivot at mid-gray 0.5
    return clamp((satColor - 0.5) * contrast + 0.5, 0.0, 1.0);
}
`
  },

  // ==========================================
  // 4. COORDINATE TRANSFORMATIONS & SPATIAL MATH
  // ==========================================
  {
    id: 'transform_depth_to_world',
    title: 'Screen UV + Depth to World Position',
    category: 'transform',
    description: 'Reconstructs full 3D World Space Position from 2D screen coordinate and depth texture using Iris inverse projection matrices.',
    tags: ['transform', 'depth', 'world-position', 'reconstruction', 'deferred'],
    inputs: 'vec2 uv, float depth, mat4 gbufferProjectionInverse, mat4 gbufferModelViewInverse, vec3 cameraPosition',
    output: 'vec3 worldPos',
    code: `// Reconstruct World Position from Screen UV and Depth
vec3 reconstructWorldPosition(vec2 uv, float depth, mat4 projInv, mat4 viewInv, vec3 camPos) {
    // Normalized Device Coordinates (NDC) [-1, 1]
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    
    // NDC to View Space
    vec4 viewPos = projInv * ndc;
    viewPos /= viewPos.w;
    
    // View Space to World Space
    vec4 worldPos = viewInv * vec4(viewPos.xyz, 1.0);
    return worldPos.xyz + camPos;
}
`
  },
  {
    id: 'transform_uv_rotate_tile',
    title: '2D UV Rotation, Pivot & Tiling',
    category: 'transform',
    description: 'Rotates texture coordinates around an arbitrary center pivot point with scale and tiling controls.',
    tags: ['transform', 'uv', 'rotate', 'scale', 'tiling', 'matrix'],
    inputs: 'vec2 uv, float angleRadians, vec2 pivot, vec2 tiling',
    output: 'vec2 rotatedUv',
    code: `// Rotate UV coordinates around pivot point
vec2 rotateAndScaleUV(vec2 uv, float angle, vec2 pivot, vec2 tiling) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 rotMat = mat2(c, -s, s, c);
    return rotMat * ((uv * tiling) - pivot) + pivot;
}
`
  },
  {
    id: 'transform_normal_from_height',
    title: 'Analytic Normal from Height Map',
    category: 'transform',
    description: 'Derives surface normal vector perturbations from procedural height derivatives (finite differences).',
    tags: ['transform', 'normal', 'bump', 'heightmap', 'derivatives'],
    inputs: 'vec2 uv, float bumpStrength',
    output: 'vec3 normal',
    code: `// Compute Normal from Height Map (Finite Difference)
// Note: Replace sampleHeight(uv) with your own procedural height function
float sampleHeight(vec2 uv);

vec3 calculateNormalFromHeight(vec2 uv, float bumpStrength) {
    vec2 eps = vec2(0.002, 0.0);
    float hL = sampleHeight(uv - eps.xy);
    float hR = sampleHeight(uv + eps.xy);
    float hD = sampleHeight(uv - eps.yx);
    float hU = sampleHeight(uv + eps.yx);
    
    vec3 normal = vec3((hL - hR) * bumpStrength, (hD - hU) * bumpStrength, 1.0);
    return normalize(normal);
}
`
  },

  // ==========================================
  // 5. MINECRAFT IRIS SPECIALS
  // ==========================================
  {
    id: 'iris_waving_foliage',
    title: 'Minecraft Realistic Foliage Waving',
    category: 'minecraft',
    description: 'Multi-frequency sinusoidal vertex wind math simulating waving grass, leaves, and crops in Minecraft Iris shaders.',
    tags: ['minecraft', 'iris', 'foliage', 'wind', 'wave', 'grass'],
    inputs: 'vec3 worldPos, float time, float windStrength',
    output: 'vec3 vertexOffset',
    code: `// Realistic Minecraft Waving Foliage / Wind Displacement
vec3 calculateFoliageWind(vec3 worldPos, float time, float windStrength) {
    float waveSpeed = time * 2.5;
    // Low frequency gust
    float gust = sin(worldPos.x * 0.2 + worldPos.z * 0.15 + waveSpeed * 0.5) * 0.5 + 0.5;
    // High frequency flutter
    float flutter = sin(worldPos.x * 3.0 + waveSpeed * 2.0) * cos(worldPos.z * 2.5 + waveSpeed * 1.8);
    
    float totalWave = (sin(worldPos.x * 1.5 + waveSpeed) * 0.7 + flutter * 0.3) * gust;
    return vec3(totalWave * windStrength * 0.1, 0.0, totalWave * windStrength * 0.08);
}
`
  },
  {
    id: 'iris_water_waves_caustics',
    title: 'Gerstner Water Wave & Caustics',
    category: 'minecraft',
    description: 'Gerstner wave synthesis with crest sharpening and animated dual-layer caustic lighting for crystal-clear Minecraft water.',
    tags: ['minecraft', 'water', 'gerstner', 'caustics', 'ocean', 'river'],
    inputs: 'vec2 uv, float time',
    output: 'float (caustic intensity & wave height)',
    code: `// Dual-Layer Animated Water Caustics
float calculateWaterCaustics(vec2 uv, float time) {
    vec2 uv1 = uv * 8.0 + vec2(time * 0.6, time * 0.4);
    vec2 uv2 = uv * 8.0 + vec2(-time * 0.5, time * 0.7);
    
    float c1 = sin(uv1.x + sin(uv1.y * 1.5 + time));
    float c2 = sin(uv2.y + sin(uv2.x * 1.5 - time));
    
    float caustic = pow(abs(c1 + c2) * 0.5, 3.0);
    return caustic * 1.8;
}

// Gerstner Wave Displacement
vec3 gerstnerWave(vec2 pos, float time, vec2 dir, float steepness, float wavelength) {
    float k = 2.0 * 3.14159 / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(dir);
    float f = k * (dot(d, pos) - c * time);
    float a = steepness / k;
    return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
}
`
  },
  {
    id: 'iris_day_night_sky',
    title: 'Celestial Day/Night Sky Gradient',
    category: 'minecraft',
    description: 'Dynamic atmospheric sky colors reacting to Iris sunPosition and worldTime, smoothly transitioning from Dawn to Noon, Sunset, and Midnight.',
    tags: ['minecraft', 'sky', 'sun', 'day-night', 'sunset', 'atmosphere'],
    inputs: 'vec3 sunPos, vec3 viewDir',
    output: 'vec3 skyColor',
    code: `// Iris Atmospheric Day / Night Sky Gradient
vec3 calculateCelestialSky(vec3 sunPosition, vec3 viewDir) {
    float sunAltitude = normalize(sunPosition).y;
    float viewAngle = max(viewDir.y, 0.0);
    
    // Day Sky
    vec3 noonZenith = vec3(0.25, 0.55, 0.95);
    vec3 noonHorizon = vec3(0.70, 0.85, 0.98);
    vec3 daySky = mix(noonHorizon, noonZenith, pow(viewAngle, 0.7));
    
    // Sunset / Sunrise Sky
    vec3 sunsetZenith = vec3(0.18, 0.22, 0.55);
    vec3 sunsetHorizon = vec3(0.98, 0.45, 0.15);
    vec3 sunsetSky = mix(sunsetHorizon, sunsetZenith, pow(viewAngle, 0.5));
    
    // Night Sky
    vec3 nightZenith = vec3(0.02, 0.04, 0.08);
    vec3 nightHorizon = vec3(0.08, 0.10, 0.18);
    vec3 nightSky = mix(nightHorizon, nightZenith, pow(viewAngle, 0.6));
    
    // Blend day, sunset, and night based on sun position
    if (sunAltitude > 0.15) {
        return mix(sunsetSky, daySky, clamp((sunAltitude - 0.15) / 0.35, 0.0, 1.0));
    } else if (sunAltitude > -0.15) {
        return mix(nightSky, sunsetSky, clamp((sunAltitude + 0.15) / 0.30, 0.0, 1.0));
    } else {
        return nightSky;
    }
}
`
  },
  {
    id: 'iris_distance_fog',
    title: 'Minecraft Atmospheric Fog Model',
    category: 'minecraft',
    description: 'Realistic exponential-squared distance fog simulating Minecraft render distance fog with depth blending.',
    tags: ['minecraft', 'fog', 'depth', 'atmosphere', 'distance'],
    inputs: 'vec3 worldPos, vec3 fogColor, float density',
    output: 'vec4 (mix factor)',
    code: `// Exponential-Squared Distance Fog
vec3 applyMinecraftFog(vec3 sceneColor, vec3 worldPos, vec3 fogColor, float density) {
    float distance = length(worldPos);
    // Exponential squared formula: exp(- (d * density)^2)
    float fogFactor = clamp(exp(-pow(distance * density, 2.0)), 0.0, 1.0);
    return mix(fogColor, sceneColor, fogFactor);
}
`
  }
];
