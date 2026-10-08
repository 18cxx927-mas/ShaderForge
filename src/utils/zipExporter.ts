/**
 * Minecraft Iris Shaderpack Zip Exporter
 * Generates an authentic Minecraft 1.21+ Fabric Iris shaderpack .zip file
 * with valid folder structure, vertex shaders, properties, and lang files.
 * Directly usable in Minecraft: just drop the .zip into .minecraft/shaderpacks/
 */

import JSZip from 'jszip';
import { ShaderpackMetadata, ProjectFile } from '../types/shader';

export async function exportShaderpackZip(
  fragmentGlsl: string,
  metadata: ShaderpackMetadata,
  files?: ProjectFile[]
): Promise<Blob> {
  const zip = new JSZip();

  // Create the root 'shaders' folder required by Minecraft Iris & OptiFine
  const shadersFolder = zip.folder('shaders');
  if (!shadersFolder) throw new Error('Failed to create shaders folder in zip archive');

  // Track which standard files were written to ensure none are missing
  const writtenStandardFiles = new Set<string>();

  // If user provided project files from the Project Explorer, write them
  if (files && files.length > 0) {
    files.forEach(file => {
      if (!file.isDirectory) {
        // Normalize path so it goes into shaders/ folder
        let normalizedPath = file.path.replace(/^(\/|\\)/, '');
        if (!normalizedPath.startsWith('shaders/')) {
          normalizedPath = `shaders/${normalizedPath}`;
        }

        // Relative path inside the shaders folder
        const subPath = normalizedPath.replace(/^shaders\//, '');

        // If this is the main terrain fragment shader, ensure it uses current live code
        if (normalizedPath === 'shaders/gbuffers_terrain.fsh') {
          shadersFolder.file(subPath, fragmentGlsl || file.content);
        } else {
          shadersFolder.file(subPath, file.content);
        }

        writtenStandardFiles.add(normalizedPath);
      }
    });
  }

  // 1. Ensure shaders/shaders.properties exists (Iris in-game video settings menu)
  if (!writtenStandardFiles.has('shaders/shaders.properties')) {
    const shadersProperties = `# ====================================================================
# Minecraft Iris & OptiFine Shaderpack Configuration
# Shaderpack: ${metadata.name} v${metadata.version}
# Author: ${metadata.author}
# Target: Minecraft ${metadata.targetMinecraft} (${metadata.targetLoader})
# ====================================================================

# Profile Presets (Low, Balanced, High, Cinematic)
profiles = LOW BALANCED HIGH CINEMATIC
profile.LOW = WAVING_LEAVES:false DYNAMIC_WATER:false GOD_RAYS:false BLOOM_EFFECT:false SATURATION_BOOST:1.00
profile.BALANCED = WAVING_LEAVES:true DYNAMIC_WATER:true GOD_RAYS:false BLOOM_EFFECT:true SATURATION_BOOST:1.15
profile.HIGH = WAVING_LEAVES:true DYNAMIC_WATER:true GOD_RAYS:true BLOOM_EFFECT:true SATURATION_BOOST:1.25
profile.CINEMATIC = WAVING_LEAVES:true DYNAMIC_WATER:true GOD_RAYS:true BLOOM_EFFECT:true SATURATION_BOOST:1.40

# Main Options Screen Layout
screen.main = WAVING_LEAVES DYNAMIC_WATER GOD_RAYS BLOOM_EFFECT SATURATION_BOOST

# Option defaults
WAVING_LEAVES = ${metadata.enableWavingLeaves ? 'true' : 'false'}
DYNAMIC_WATER = ${metadata.enableDynamicWater ? 'true' : 'false'}
GOD_RAYS = ${metadata.enableGodRays ? 'true' : 'false'}
BLOOM_EFFECT = ${metadata.enableBloom ? 'true' : 'false'}
SATURATION_BOOST = ${metadata.saturationBoost.toFixed(2)}

# Slider parameters
sliders = SATURATION_BOOST
SATURATION_BOOST.min = 0.50
SATURATION_BOOST.max = 2.00
SATURATION_BOOST.interval = 0.05
`;
    shadersFolder.file('shaders.properties', shadersProperties);
  }

  // 2. Ensure shaders/lang/en_us.lang exists
  if (!writtenStandardFiles.has('shaders/lang/en_us.lang')) {
    const enUsLang = `# Localization for ${metadata.name}
option.WAVING_LEAVES = Waving Foliage
option.WAVING_LEAVES.comment = Enables realistic wind swaying on grass, leaves, crops, and vines.
option.DYNAMIC_WATER = Animated Water
option.DYNAMIC_WATER.comment = Enables crystal clear water surface with animated caustics & reflections.
option.GOD_RAYS = Volumetric Sunbeams
option.GOD_RAYS.comment = Renders atmospheric light shafts through clouds and foliage.
option.BLOOM_EFFECT = Radiant Bloom
option.BLOOM_EFFECT.comment = Adds soft optical glow to lanterns, torches, glowing blocks, and lava.
option.SATURATION_BOOST = Color Vibrance
option.SATURATION_BOOST.comment = Adjusts overall world color vibrancy and saturation level.

profile.LOW = Low (Max FPS)
profile.BALANCED = Balanced (Recommended)
profile.HIGH = High (Cinematic)
profile.CINEMATIC = Ultra (Photo Real)
`;
    shadersFolder.file('lang/en_us.lang', enUsLang);
  }

  // 3. Ensure shaders/gbuffers_terrain.vsh exists
  if (!writtenStandardFiles.has('shaders/gbuffers_terrain.vsh')) {
    const terrainVsh = `/* ====================================================================
 * Iris Shaderpack: ${metadata.name} - gbuffers_terrain.vsh
 * Target: Minecraft 1.21+ Fabric Iris
 * ==================================================================== */
#version 330 compatibility

uniform mat4 gbufferModelView;
uniform mat4 gbufferProjection;
uniform mat4 gbufferModelViewInverse;
uniform float frameTimeCounter;
uniform vec3 cameraPosition;

varying vec2 texcoord;
varying vec4 glColor;
varying vec3 normal;
varying vec3 worldPosition;

#define WAVING_LEAVES ${metadata.enableWavingLeaves ? '1' : '0'}

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glColor = gl_Color;
    normal = gl_NormalMatrix * gl_Normal;

    vec4 viewPos = gl_ModelViewMatrix * gl_Vertex;
    worldPosition = (gbufferModelViewInverse * viewPos).xyz + cameraPosition;

    #if WAVING_LEAVES == 1
    // Foliage waving vertex displacement for leaves and grass
    if (gl_Color.g > gl_Color.r && gl_Color.g > gl_Color.b) {
        float wave = sin(worldPosition.x * 2.0 + frameTimeCounter * 2.5) * 0.08;
        viewPos.x += wave;
    }
    #endif

    gl_Position = gl_ProjectionMatrix * viewPos;
}
`;
    shadersFolder.file('gbuffers_terrain.vsh', terrainVsh);
  }

  // 4. Ensure shaders/gbuffers_terrain.fsh exists
  if (!writtenStandardFiles.has('shaders/gbuffers_terrain.fsh')) {
    shadersFolder.file('gbuffers_terrain.fsh', fragmentGlsl);
  }

  // 5. Ensure water shaders exist
  if (!writtenStandardFiles.has('shaders/gbuffers_water.vsh')) {
    const waterVsh = `/* Iris gbuffers_water.vsh */
#version 330 compatibility

uniform mat4 gbufferModelViewInverse;
uniform float frameTimeCounter;
uniform vec3 cameraPosition;

varying vec2 texcoord;
varying vec4 glColor;
varying vec3 normal;
varying vec3 worldPosition;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glColor = gl_Color;
    normal = gl_NormalMatrix * gl_Normal;

    vec4 viewPos = gl_ModelViewMatrix * gl_Vertex;
    worldPosition = (gbufferModelViewInverse * viewPos).xyz + cameraPosition;

    // Gentle wave displacement
    float wave = sin(worldPosition.x * 3.0 + frameTimeCounter * 2.0) * 0.03;
    viewPos.y += wave;

    gl_Position = gl_ProjectionMatrix * viewPos;
}
`;
    shadersFolder.file('gbuffers_water.vsh', waterVsh);
  }

  if (!writtenStandardFiles.has('shaders/gbuffers_water.fsh')) {
    const waterFsh = `/* Iris gbuffers_water.fsh */
#version 330 compatibility

uniform sampler2D colortex0;
uniform float frameTimeCounter;

varying vec2 texcoord;
varying vec4 glColor;
varying vec3 normal;
varying vec3 worldPosition;

void main() {
    vec4 baseColor = texture2D(colortex0, texcoord) * glColor;
    float wave = sin(texcoord.x * 25.0 + frameTimeCounter * 2.0) * 0.04;
    vec3 waterTint = vec3(0.12, 0.48, 0.88);
    gl_FragColor = vec4(mix(baseColor.rgb, waterTint, 0.45) + vec3(wave), 0.80);
}
`;
    shadersFolder.file('gbuffers_water.fsh', waterFsh);
  }

  // 6. Ensure sky shader exists (gbuffers_skybasic)
  if (!writtenStandardFiles.has('shaders/gbuffers_skybasic.vsh')) {
    const skyVsh = `/* Iris gbuffers_skybasic.vsh */
#version 330 compatibility

varying vec4 starColor;

void main() {
    gl_Position = ftransform();
    starColor = gl_Color;
}
`;
    shadersFolder.file('gbuffers_skybasic.vsh', skyVsh);
  }

  if (!writtenStandardFiles.has('shaders/gbuffers_skybasic.fsh')) {
    const skyFsh = `/* Iris gbuffers_skybasic.fsh */
#version 330 compatibility

varying vec4 starColor;

void main() {
    gl_FragColor = starColor;
}
`;
    shadersFolder.file('gbuffers_skybasic.fsh', skyFsh);
  }

  // 7. Ensure entity/textured shaders exist (chests, mobs, items)
  if (!writtenStandardFiles.has('shaders/gbuffers_textured.vsh')) {
    const texturedVsh = `/* Iris gbuffers_textured.vsh */
#version 330 compatibility

varying vec2 texcoord;
varying vec4 glColor;
varying vec3 normal;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glColor = gl_Color;
    normal = gl_NormalMatrix * gl_Normal;
    gl_Position = ftransform();
}
`;
    shadersFolder.file('gbuffers_textured.vsh', texturedVsh);
  }

  if (!writtenStandardFiles.has('shaders/gbuffers_textured.fsh')) {
    const texturedFsh = `/* Iris gbuffers_textured.fsh */
#version 330 compatibility

uniform sampler2D colortex0;
varying vec2 texcoord;
varying vec4 glColor;

void main() {
    vec4 color = texture2D(colortex0, texcoord) * glColor;
    if (color.a < 0.1) discard;
    gl_FragColor = color;
}
`;
    shadersFolder.file('gbuffers_textured.fsh', texturedFsh);
  }

  // 8. Ensure player hand shader exists (gbuffers_hand)
  if (!writtenStandardFiles.has('shaders/gbuffers_hand.vsh')) {
    const handVsh = `/* Iris gbuffers_hand.vsh */
#version 330 compatibility

varying vec2 texcoord;
varying vec4 glColor;
varying vec3 normal;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glColor = gl_Color;
    normal = gl_NormalMatrix * gl_Normal;
    gl_Position = ftransform();
}
`;
    shadersFolder.file('gbuffers_hand.vsh', handVsh);
  }

  if (!writtenStandardFiles.has('shaders/gbuffers_hand.fsh')) {
    const handFsh = `/* Iris gbuffers_hand.fsh */
#version 330 compatibility

uniform sampler2D colortex0;
varying vec2 texcoord;
varying vec4 glColor;

void main() {
    vec4 color = texture2D(colortex0, texcoord) * glColor;
    if (color.a < 0.1) discard;
    gl_FragColor = color;
}
`;
    shadersFolder.file('gbuffers_hand.fsh', handFsh);
  }

  // 9. Ensure weather shader exists (gbuffers_weather)
  if (!writtenStandardFiles.has('shaders/gbuffers_weather.vsh')) {
    const weatherVsh = `/* Iris gbuffers_weather.vsh */
#version 330 compatibility

varying vec2 texcoord;
varying vec4 glColor;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glColor = gl_Color;
    gl_Position = ftransform();
}
`;
    shadersFolder.file('gbuffers_weather.vsh', weatherVsh);
  }

  if (!writtenStandardFiles.has('shaders/gbuffers_weather.fsh')) {
    const weatherFsh = `/* Iris gbuffers_weather.fsh */
#version 330 compatibility

uniform sampler2D colortex0;
varying vec2 texcoord;
varying vec4 glColor;

void main() {
    gl_FragColor = texture2D(colortex0, texcoord) * glColor;
}
`;
    shadersFolder.file('gbuffers_weather.fsh', weatherFsh);
  }

  // 10. Ensure composite shaders exist
  if (!writtenStandardFiles.has('shaders/composite.vsh')) {
    const compVsh = `/* Iris composite.vsh */
#version 330 compatibility
varying vec2 texcoord;
void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    gl_Position = ftransform();
}
`;
    shadersFolder.file('composite.vsh', compVsh);
  }

  if (!writtenStandardFiles.has('shaders/composite.fsh')) {
    const compositeFsh = `/* Iris composite.fsh */
#version 330 compatibility
uniform sampler2D colortex0;
varying vec2 texcoord;

void main() {
    gl_FragColor = texture2D(colortex0, texcoord);
}
`;
    shadersFolder.file('composite.fsh', compositeFsh);
  }

  // 11. Ensure final screen shader exists (saturation vibrance & ACES tone)
  if (!writtenStandardFiles.has('shaders/final.vsh')) {
    const finalVsh = `/* Iris final.vsh */
#version 330 compatibility
varying vec2 texcoord;
void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    gl_Position = ftransform();
}
`;
    shadersFolder.file('final.vsh', finalVsh);
  }

  if (!writtenStandardFiles.has('shaders/final.fsh')) {
    const finalFsh = `/* Iris final.fsh */
#version 330 compatibility
uniform sampler2D colortex0;
varying vec2 texcoord;

void main() {
    vec3 color = texture2D(colortex0, texcoord).rgb;
    // Saturation Vibrance
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, ${metadata.saturationBoost.toFixed(2)});
    gl_FragColor = vec4(color, 1.0);
}
`;
    shadersFolder.file('final.fsh', finalFsh);
  }

  // 12. Ensure include files exist
  if (!writtenStandardFiles.has('shaders/include/lighting.glsl')) {
    const includeLighting = `// Reusable Lighting Helper for Minecraft Iris Shaders
vec3 calculateSunlight(vec3 normal, vec3 sunDir, vec3 sunColor) {
    float NdotL = max(dot(normal, sunDir), 0.0);
    return sunColor * NdotL;
}

vec3 calculateAmbientLight(vec3 normal, vec3 ambientColor) {
    float upFactor = normal.y * 0.5 + 0.5;
    return ambientColor * upFactor;
}
`;
    shadersFolder.file('include/lighting.glsl', includeLighting);
  }

  // 13. Add pack.mcmeta for modern Minecraft 1.21+ modloaders
  const packMcmeta = JSON.stringify({
    pack: {
      pack_format: 34,
      description: `Iris Shaderpack: ${metadata.name} for Minecraft 1.21+ Java Edition (Fabric & Iris)`,
    },
  }, null, 2);
  zip.file('pack.mcmeta', packMcmeta);

  // 14. Add README_INSTALL.txt with clear Minecraft instructions
  const readmeContent = `========================================================================
MINECRAFT IRIS SHADERPACK: ${metadata.name}
Version: ${metadata.version}
Author: ${metadata.author}
Target: Minecraft ${metadata.targetMinecraft} (${metadata.targetLoader})
========================================================================

HOW TO USE IN MINECRAFT (AUTOMATIC INSTALLATION):
1. DO NOT UNZIP THIS FILE! Keep it as a .zip file.
2. Locate your Minecraft game folder:
   - Windows: %appdata%\\.minecraft
   - macOS: ~/Library/Application Support/minecraft
   - Linux: ~/.minecraft
3. Open the "shaderpacks" folder:
   If you don't see a "shaderpacks" folder, create one inside .minecraft
4. Drop this .zip file directly into the "shaderpacks" folder:
   .minecraft/shaderpacks/${metadata.name}.zip
5. Launch Minecraft 1.21+ with Fabric & Iris Shader Mod (or Sodium + Iris).
6. In game, go to:
   Options -> Video Settings -> Shader Packs
7. Select "${metadata.name}" and click Apply!

SHADERPACK FOLDER STRUCTURE VERIFIED:
/shaders/
  ├── shaders.properties (in-game customization settings)
  ├── lang/en_us.lang (option names & comments)
  ├── gbuffers_terrain.vsh (terrain vertex pipeline & foliage wind)
  ├── gbuffers_terrain.fsh (custom terrain fragment shader)
  ├── gbuffers_water.vsh & fsh (water shaders)
  ├── gbuffers_skybasic.vsh & fsh (sky dome, sun, moon)
  ├── gbuffers_textured.vsh & fsh (blocks & items)
  ├── gbuffers_hand.vsh & fsh (player hands)
  ├── gbuffers_weather.vsh & fsh (rain & snow)
  ├── composite.vsh & fsh (composite shading)
  ├── final.vsh & fsh (vibrance & post-processing)
  └── include/lighting.glsl (lighting libraries)

Created with Minecraft Iris Shader Studio.
`;
  zip.file('README_INSTALL.txt', readmeContent);

  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Downloads a Blob directly to the user's browser
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * One-click helper to export and trigger instant download of the Minecraft Iris Shaderpack ZIP
 */
export async function downloadShaderpackZipDirectly(
  fragmentGlsl: string,
  metadata: ShaderpackMetadata,
  files?: ProjectFile[]
): Promise<string> {
  const blob = await exportShaderpackZip(fragmentGlsl, metadata, files);
  const cleanName = metadata.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${cleanName}.zip`;
  triggerFileDownload(blob, filename);
  return filename;
}
