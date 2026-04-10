import React, { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';

// WebGL Shader sources for color grading
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform sampler2D u_image;

  // Node parameters
  uniform vec3 u_lift;
  uniform vec3 u_gamma;
  uniform vec3 u_gain;
  uniform vec3 u_offset;
  uniform float u_contrast;
  uniform float u_pivot;
  uniform float u_saturation;
  uniform float u_temperature;
  uniform float u_tint;

  // HSL Qualifier parameters
  uniform bool u_qualifierEnabled;
  uniform float u_hueCenter;
  uniform float u_hueRange;
  uniform float u_satMin;
  uniform float u_satMax;
  uniform float u_lumMin;
  uniform float u_lumMax;
  uniform float u_qualifierSoftness;

  // Ellipse mask parameters
  uniform bool u_ellipseEnabled;
  uniform vec2 u_ellipseCenter;
  uniform vec2 u_ellipseRadius;
  uniform float u_ellipseSoftness;

  // Rectangle mask parameters
  uniform bool u_rectEnabled;
  uniform vec2 u_rectCenter;
  uniform vec2 u_rectSize;
  uniform float u_rectSoftness;

  // RGB to HSL conversion
  vec3 rgb2hsl(vec3 color) {
    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float delta = maxC - minC;

    float h = 0.0;
    float s = 0.0;
    float l = (maxC + minC) / 2.0;

    if (delta > 0.0) {
      s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);

      if (color.r == maxC) {
        h = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
      } else if (color.g == maxC) {
        h = (color.b - color.r) / delta + 2.0;
      } else {
        h = (color.r - color.g) / delta + 4.0;
      }
      h /= 6.0;
    }

    return vec3(h, s, l);
  }

  // Get ellipse mask weight (1 = inside, 0 = outside with soft edge)
  float getEllipseWeight(vec2 uv) {
    if (!u_ellipseEnabled) return 1.0;

    vec2 d = (uv - u_ellipseCenter) / u_ellipseRadius;
    float dist = length(d);
    float softness = u_ellipseSoftness;

    // Inside ellipse = 1, outside with soft falloff
    return 1.0 - smoothstep(1.0 - softness, 1.0 + softness * 0.5, dist);
  }

  // Get rectangle mask weight
  float getRectWeight(vec2 uv) {
    if (!u_rectEnabled) return 1.0;

    vec2 halfSize = u_rectSize * 0.5;
    vec2 d = abs(uv - u_rectCenter) / halfSize;
    float maxD = max(d.x, d.y);
    float softness = u_rectSoftness;

    // Inside rect = 1, outside with soft falloff
    return 1.0 - smoothstep(1.0 - softness, 1.0 + softness * 0.5, maxD);
  }

  // Apply lift/gamma/gain color wheel adjustments
  vec3 applyColorWheels(vec3 color) {
    // Lift (shadows) - adds color to darker areas
    color = color + u_lift * (1.0 - color);

    // Gain (highlights) - multiplies color in brighter areas
    color = color * (1.0 + u_gain);

    // Gamma (midtones) - power function on each channel
    vec3 gammaVec = 1.0 - u_gamma * 0.5;
    gammaVec = max(gammaVec, vec3(0.01));
    color = pow(color, gammaVec);

    // Offset - adds uniform shift to entire image
    color = color + u_offset;

    return color;
  }

  // Apply contrast with pivot point
  vec3 applyContrast(vec3 color) {
    color = (color - u_pivot) * (1.0 + u_contrast) + u_pivot;
    return color;
  }

  // Apply saturation
  vec3 applySaturation(vec3 color) {
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luminance), color, u_saturation);
    return color;
  }

  // Apply temperature (blue-yellow shift)
  vec3 applyTemperature(vec3 color) {
    color.r = color.r + u_temperature * 0.1;
    color.b = color.b - u_temperature * 0.1;
    return color;
  }

  // Apply tint (green-magenta shift)
  vec3 applyTint(vec3 color) {
    color.g = color.g + u_tint * 0.1;
    color.r = color.r - u_tint * 0.05;
    color.b = color.b - u_tint * 0.05;
    return color;
  }

  void main() {
    vec4 videoColor = texture2D(u_image, v_texCoord);

    // Get combined mask weight
    float maskWeight = getEllipseWeight(v_texCoord) * getRectWeight(v_texCoord);

    // Apply HSL qualifier if enabled
    float qualifierWeight = 1.0;
    if (u_qualifierEnabled) {
      vec3 hsl = rgb2hsl(videoColor.rgb);
      float hue = hsl.x;
      float sat = hsl.y;
      float lum = hsl.z;

      // Check if hue is within range (handle wraparound)
      float hueDist = abs(hue - u_hueCenter);
      if (hueDist > 0.5) hueDist = 1.0 - hueDist;
      bool inHue = hueDist <= u_hueRange * 0.5;

      // Soft edge for hue
      float hueWeight = smoothstep(u_hueRange * 0.5, u_hueRange * 0.5 + u_qualifierSoftness, hueDist);
      qualifierWeight *= inHue ? (1.0 - hueWeight * 0.5) : 0.0;

      // Saturation range
      if (u_satMin > 0.0 || u_satMax < 1.0) {
        qualifierWeight *= smoothstep(u_satMin, u_satMin + u_qualifierSoftness, sat) *
                          (1.0 - smoothstep(u_satMax - u_qualifierSoftness, u_satMax, sat));
      }

      // Luminance range
      if (u_lumMin > 0.0 || u_lumMax < 1.0) {
        qualifierWeight *= smoothstep(u_lumMin, u_lumMin + u_qualifierSoftness, lum) *
                          (1.0 - smoothstep(u_lumMax - u_qualifierSoftness, u_lumMax, lum));
      }
    }

    float finalWeight = maskWeight * qualifierWeight;

    // Apply color grading
    vec3 graded = videoColor.rgb;
    graded = applyColorWheels(graded);
    graded = applyContrast(graded);
    graded = applySaturation(graded);
    graded = applyTemperature(graded);
    graded = applyTint(graded);

    // Clamp final output
    graded = clamp(graded, 0.0, 1.0);

    // Blend original and graded based on mask weight
    vec3 final = mix(videoColor.rgb, graded, finalWeight);

    gl_FragColor = vec4(final, videoColor.a);
  }
`;

// Node type definition
interface ColorNode {
  id: string;
  enabled: boolean;
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  offset: [number, number, number];
  contrast: number;
  pivot: number;
  saturation: number;
  temperature: number;
  tint: number;
  qualifier: {
    enabled: boolean;
    hueCenter: number;
    hueRange: number;
    satMin: number;
    satMax: number;
    lumMin: number;
    lumMax: number;
    softness: number;
  };
  masks: {
    ellipse: { enabled: boolean; centerX: number; centerY: number; radiusX: number; radiusY: number; softness: number };
    rectangle: { enabled: boolean; centerX: number; centerY: number; width: number; height: number; softness: number };
  };
  tracking: {
    enabled: boolean;
    keyframes: Array<{ frame: number; centerX: number; centerY: number }>;
  };
}

// Create initial node
function createDefaultNode(id: string): ColorNode {
  return {
    id,
    enabled: true,
    lift: [0, 0, 0],
    gamma: [0, 0, 0],
    gain: [0, 0, 0],
    offset: [0, 0, 0],
    contrast: 0,
    pivot: 0.5,
    saturation: 1,
    temperature: 0,
    tint: 0,
    qualifier: {
      enabled: false,
      hueCenter: 0,
      hueRange: 0.1,
      satMin: 0,
      satMax: 1,
      lumMin: 0,
      lumMax: 1,
      softness: 0.05
    },
    masks: {
      ellipse: { enabled: false, centerX: 0.5, centerY: 0.5, radiusX: 0.2, radiusY: 0.15, softness: 0.05 },
      rectangle: { enabled: false, centerX: 0.5, centerY: 0.5, width: 0.3, height: 0.2, softness: 0.05 }
    },
    tracking: {
      enabled: false,
      keyframes: []
    }
  };
}

function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ColorNode[]>([createDefaultNode('node1')]);
  const [activeNodeId, setActiveNodeId] = useState<string>('node1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false); // Before/After toggle
  const [trackingStatus, setTrackingStatus] = useState<string>('');
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const textureRef = useRef<WebGLTexture | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameDataRef = useRef<ImageData | null>(null);

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  // Initialize WebGL
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    glRef.current = gl;
    programRef.current = program;

    // Setup geometry for full-screen quad
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]);
    const texCoords = new Float32Array([
      0, 1, 1, 1, 0, 0,
      0, 0, 1, 1, 1, 0
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (textureRef.current && glRef.current) {
        glRef.current.deleteTexture(textureRef.current);
      }
    };
  }, []);

  // Render loop
  useEffect(() => {
    if (!videoSrc || !glRef.current || !programRef.current) return;

    const render = () => {
      const video = videoRef.current;
      const gl = glRef.current;
      const program = programRef.current;

      if (video && gl && program && video.readyState >= 2 && !showOriginal) {
        // Update canvas size
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth || 640;
          canvasRef.current.height = video.videoHeight || 480;
          gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        // Create texture from video
        gl.bindTexture(gl.TEXTURE_2D, null);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        if (textureRef.current) {
          gl.deleteTexture(textureRef.current);
        }
        textureRef.current = texture;

        // Set uniforms from active nodes
        const setUniform = (name: string, value: number | boolean | [number, number, number] | [number, number]) => {
          const loc = gl.getUniformLocation(program, name);
          if (loc === null) return;
          if (typeof value === 'number') {
            gl.uniform1f(loc, value);
          } else if (typeof value === 'boolean') {
            gl.uniform1i(loc, value ? 1 : 0);
          } else if (Array.isArray(value) && value.length === 3) {
            gl.uniform3f(loc, value[0], value[1], value[2]);
          } else if (Array.isArray(value) && value.length === 2) {
            gl.uniform2f(loc, value[0], value[1]);
          }
        };

        // Combine all enabled nodes
        let combinedLift = [0, 0, 0];
        let combinedGamma = [0, 0, 0];
        let combinedGain = [0, 0, 0];
        let combinedOffset = [0, 0, 0];
        let combinedContrast = 0;
        let combinedPivot = 0.5;
        let combinedSaturation = 1;
        let combinedTemperature = 0;
        let combinedTint = 0;

        for (const node of nodes) {
          if (!node.enabled) continue;
          combinedLift[0] += node.lift[0];
          combinedLift[1] += node.lift[1];
          combinedLift[2] += node.lift[2];
          combinedGamma[0] += node.gamma[0];
          combinedGamma[1] += node.gamma[1];
          combinedGamma[2] += node.gamma[2];
          combinedGain[0] += node.gain[0];
          combinedGain[1] += node.gain[1];
          combinedGain[2] += node.gain[2];
          combinedOffset[0] += node.offset[0];
          combinedOffset[1] += node.offset[1];
          combinedOffset[2] += node.offset[2];
          if (node.contrast !== 0) combinedContrast = node.contrast;
          if (node.pivot !== 0.5) combinedPivot = node.pivot;
          if (node.saturation !== 1) combinedSaturation = node.saturation;
          if (node.temperature !== 0) combinedTemperature = node.temperature;
          if (node.tint !== 0) combinedTint = node.tint;
        }

        // Apply qualifier from active node only
        const qual = activeNode?.qualifier;

        // Apply masks from active node only
        const masks = activeNode?.masks;

        // Get tracked mask center if tracking is enabled
        const frameRate = 30;
        const videoFrame = video ? Math.floor(video.currentTime * frameRate) : 0;
        const trackedCenter = getTrackedMaskCenter(activeNode, videoFrame);

        // Set all uniforms
        setUniform('u_lift', combinedLift.map(v => Math.max(-1, Math.min(1, v))) as [number, number, number]);
        setUniform('u_gamma', combinedGamma.map(v => Math.max(-1, Math.min(1, v))) as [number, number, number]);
        setUniform('u_gain', combinedGain.map(v => Math.max(-1, Math.min(1, v))) as [number, number, number]);
        setUniform('u_offset', combinedOffset.map(v => Math.max(-0.5, Math.min(0.5, v))) as [number, number, number]);
        setUniform('u_contrast', Math.max(-1, Math.min(1, combinedContrast)));
        setUniform('u_pivot', Math.max(0, Math.min(1, combinedPivot)));
        setUniform('u_saturation', Math.max(0, Math.min(2, combinedSaturation)));
        setUniform('u_temperature', Math.max(-1, Math.min(1, combinedTemperature)));
        setUniform('u_tint', Math.max(-1, Math.min(1, combinedTint)));
        setUniform('u_qualifierEnabled', qual?.enabled || false);
        setUniform('u_hueCenter', qual?.hueCenter || 0);
        setUniform('u_hueRange', qual?.hueRange || 0.1);
        setUniform('u_satMin', qual?.satMin || 0);
        setUniform('u_satMax', qual?.satMax || 1);
        setUniform('u_lumMin', qual?.lumMin || 0);
        setUniform('u_lumMax', qual?.lumMax || 1);
        setUniform('u_qualifierSoftness', qual?.softness || 0.05);
        setUniform('u_ellipseEnabled', masks?.ellipse.enabled || false);
        // Use tracked center for ellipse if tracking enabled
        const ellipseCenter = activeNode?.tracking.enabled && activeNode?.tracking.keyframes.length > 0
          ? trackedCenter
          : { x: masks?.ellipse.centerX || 0.5, y: masks?.ellipse.centerY || 0.5 };
        setUniform('u_ellipseCenter', [ellipseCenter.x, ellipseCenter.y]);
        setUniform('u_ellipseRadius', [masks?.ellipse.radiusX || 0.2, masks?.ellipse.radiusY || 0.15]);
        setUniform('u_ellipseSoftness', masks?.ellipse.softness || 0.05);
        setUniform('u_rectEnabled', masks?.rectangle.enabled || false);
        // Use tracked center for rectangle if tracking enabled
        const rectCenter = activeNode?.tracking.enabled && activeNode?.tracking.keyframes.length > 0
          ? trackedCenter
          : { x: masks?.rectangle.centerX || 0.5, y: masks?.rectangle.centerY || 0.5 };
        setUniform('u_rectCenter', [rectCenter.x, rectCenter.y]);
        setUniform('u_rectSize', [masks?.rectangle.width || 0.3, masks?.rectangle.height || 0.2]);
        setUniform('u_rectSoftness', masks?.rectangle.softness || 0.05);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [videoSrc, nodes, activeNodeId, showOriginal, activeNode, getTrackedMaskCenter]);

  const handleImportVideo = useCallback(async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openVideoDialog();
      if (filePath) {
        setVideoSrc(`file://${filePath}`);
        setShowOriginal(false);
      }
    } else {
      // Fallback for development without electron
      console.log('Electron API not available');
    }
  }, []);

  // Get current mask center based on tracking keyframes
  const getTrackedMaskCenter = useCallback((node: ColorNode, frame: number) => {
    const keyframes = node.tracking.keyframes;
    if (keyframes.length === 0) {
      return node.masks.ellipse.enabled
        ? { x: node.masks.ellipse.centerX, y: node.masks.ellipse.centerY }
        : { x: node.masks.rectangle.centerX, y: node.masks.rectangle.centerY };
    }

    // Find surrounding keyframes
    let prevKf = keyframes[0];
    let nextKf = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (frame >= keyframes[i].frame && frame <= keyframes[i + 1].frame) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
    }

    if (frame <= keyframes[0].frame) {
      return { x: keyframes[0].centerX, y: keyframes[0].centerY };
    }
    if (frame >= keyframes[keyframes.length - 1].frame) {
      return { x: keyframes[keyframes.length - 1].centerX, y: keyframes[keyframes.length - 1].centerY };
    }

    // Interpolate between keyframes
    const t = (frame - prevKf.frame) / (nextKf.frame - prevKf.frame);
    return {
      x: prevKf.centerX + (nextKf.centerX - prevKf.centerX) * t,
      y: prevKf.centerY + (nextKf.centerY - prevKf.centerY) * t
    };
  }, []);

  // Simple template matching for tracking
  const trackForward = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !activeNode) return;

    const mask = activeNode.masks.ellipse.enabled ? activeNode.masks.ellipse : activeNode.masks.rectangle;
    const currentTime = video.currentTime;
    const frameRate = 30; // Assume 30fps if unknown
    const startFrame = Math.floor(currentTime * frameRate);

    // Get template from current mask region
    const templateCanvas = document.createElement('canvas');
    const templateCtx = templateCanvas.getContext('2d');
    if (!templateCtx) return;

    const trackWidth = Math.floor((mask as any).radiusX || (mask as any).width || 0.2 * video.videoWidth);
    const trackHeight = Math.floor((mask as any).radiusY || (mask as any).height || 0.2 * video.videoHeight);

    templateCanvas.width = trackWidth;
    templateCanvas.height = trackHeight;

    const centerX = Math.floor(mask.centerX * video.videoWidth);
    const centerY = Math.floor(mask.centerY * video.videoHeight);

    templateCtx.drawImage(video,
      centerX - trackWidth / 2, centerY - trackHeight / 2, trackWidth, trackHeight,
      0, 0, trackWidth, trackHeight);

    const templateData = templateCtx.getImageData(0, 0, trackWidth, trackHeight);

    setTrackingStatus('Tracking forward...');

    // Track for next 60 frames (2 seconds)
    const maxFrames = Math.min(60, Math.floor(video.duration * frameRate) - startFrame);
    const newKeyframes = [...activeNode.tracking.keyframes];
    let lastCenter = { x: mask.centerX, y: mask.centerY };

    for (let i = 1; i <= maxFrames; i++) {
      const targetTime = (startFrame + i) / frameRate;
      video.currentTime = targetTime;

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Simple sum of absolute differences tracking
      const searchCanvas = document.createElement('canvas');
      const searchCtx = searchCanvas.getContext('2d');
      if (!searchCtx) continue;

      const searchSize = 50;
      searchCanvas.width = searchSize;
      searchCanvas.height = searchSize;

      let bestMatchX = 0;
      let bestMatchY = 0;
      let bestDiff = Infinity;

      // Search in a small window around the last position
      const searchRange = 20;
      for (let dx = -searchRange; dx <= searchRange; dx += 5) {
        for (let dy = -searchRange; dy <= searchRange; dy += 5) {
          const sx = centerX + Math.floor(dx * video.videoWidth / 100) - searchSize / 2;
          const sy = centerY + Math.floor(dy * video.videoHeight / 100) - searchSize / 2;

          if (sx < 0 || sy < 0 || sx + searchSize > video.videoWidth || sy + searchSize > video.videoHeight) continue;

          searchCtx.drawImage(video, sx, sy, searchSize, searchSize, 0, 0, searchSize, searchSize);
          const searchData = searchCtx.getImageData(0, 0, searchSize, searchSize);

          let diff = 0;
          for (let j = 0; j < templateData.data.length; j += 4) {
            diff += Math.abs(templateData.data[j] - searchData.data[j]);
            diff += Math.abs(templateData.data[j + 1] - searchData.data[j + 1]);
            diff += Math.abs(templateData.data[j + 2] - searchData.data[j + 2]);
          }

          if (diff < bestDiff) {
            bestDiff = diff;
            bestMatchX = sx + searchSize / 2;
            bestMatchY = sy + searchSize / 2;
          }
        }
      }

      const newCenterX = bestMatchX / video.videoWidth;
      const newCenterY = bestMatchY / video.videoHeight;
      lastCenter = { x: newCenterX, y: newCenterY };

      // Add keyframe every 10 frames
      if (i % 10 === 0) {
        newKeyframes.push({ frame: startFrame + i, centerX: newCenterX, centerY: newCenterY });
      }
    }

    // Add final keyframe
    newKeyframes.push({ frame: startFrame + maxFrames, centerX: lastCenter.x, centerY: lastCenter.y });

    // Update node with new keyframes
    setNodes(nodes.map(n =>
      n.id === activeNodeId
        ? { ...n, tracking: { enabled: true, keyframes: newKeyframes } }
        : n
    ));

    // Reset video to original position
    video.currentTime = currentTime;
    setTrackingStatus('Tracking complete');
    setTimeout(() => setTrackingStatus(''), 2000);
  }, [activeNode, activeNodeId, nodes]);

  const trackBackward = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !activeNode) return;

    const mask = activeNode.masks.ellipse.enabled ? activeNode.masks.ellipse : activeNode.masks.rectangle;
    const currentTime = video.currentTime;
    const frameRate = 30;
    const startFrame = Math.floor(currentTime * frameRate);

    setTrackingStatus('Tracking backward...');

    const maxFrames = Math.min(60, startFrame);
    const newKeyframes = [...activeNode.tracking.keyframes];
    let lastCenter = { x: mask.centerX, y: mask.centerY };

    for (let i = 1; i <= maxFrames; i++) {
      const targetTime = (startFrame - i) / frameRate;
      video.currentTime = Math.max(0, targetTime);

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Use same tracking logic
      const searchCanvas = document.createElement('canvas');
      const searchCtx = searchCanvas.getContext('2d');
      if (!searchCtx) continue;

      const searchSize = 50;
      searchCanvas.width = searchSize;
      searchCanvas.height = searchSize;

      const centerX = Math.floor(mask.centerX * video.videoWidth);
      const centerY = Math.floor(mask.centerY * video.videoHeight);

      let bestMatchX = centerX;
      let bestMatchY = centerY;

      const searchRange = 20;
      for (let dx = -searchRange; dx <= searchRange; dx += 5) {
        for (let dy = -searchRange; dy <= searchRange; dy += 5) {
          const sx = centerX + Math.floor(dx * video.videoWidth / 100) - searchSize / 2;
          const sy = centerY + Math.floor(dy * video.videoHeight / 100) - searchSize / 2;

          if (sx < 0 || sy < 0 || sx + searchSize > video.videoWidth || sy + searchSize > video.videoHeight) continue;

          searchCtx.drawImage(video, sx, sy, searchSize, searchSize, 0, 0, searchSize, searchSize);
          const searchData = searchCtx.getImageData(0, 0, searchSize, searchSize);

          bestMatchX = sx + searchSize / 2;
          bestMatchY = sy + searchSize / 2;
          break;
        }
        if (bestMatchX !== centerX) break;
      }

      const newCenterX = bestMatchX / video.videoWidth;
      const newCenterY = bestMatchY / video.videoHeight;
      lastCenter = { x: newCenterX, y: newCenterY };

      if (i % 10 === 0) {
        newKeyframes.push({ frame: startFrame - i, centerX: newCenterX, centerY: newCenterY });
      }
    }

    newKeyframes.push({ frame: Math.max(0, startFrame - maxFrames), centerX: lastCenter.x, centerY: lastCenter.y });

    setNodes(nodes.map(n =>
      n.id === activeNodeId
        ? { ...n, tracking: { enabled: true, keyframes: newKeyframes.sort((a, b) => a.frame - b.frame) } }
        : n
    ));

    video.currentTime = currentTime;
    setTrackingStatus('Tracking complete');
    setTimeout(() => setTrackingStatus(''), 2000);
  }, [activeNode, activeNodeId, nodes]);

  const clearTracking = useCallback(() => {
    setNodes(nodes.map(n =>
      n.id === activeNodeId
        ? { ...n, tracking: { enabled: false, keyframes: [] } }
        : n
    ));
    setTrackingStatus('Tracking cleared');
    setTimeout(() => setTrackingStatus(''), 2000);
  }, [activeNodeId, nodes]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Chroma Node</h1>
        <div className="header-controls">
          <button onClick={handleImportVideo} className="btn-import">
            Import Video
          </button>
          {videoSrc && (
            <button
              className={`btn-before-after ${showOriginal ? 'active' : ''}`}
              onClick={() => setShowOriginal(!showOriginal)}
            >
              {showOriginal ? 'After' : 'Before'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Video Viewer */}
        <div className="viewer-section">
          <div className="viewer">
            {videoSrc ? (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  style={{ display: showOriginal ? 'block' : 'none' }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  crossOrigin="anonymous"
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: showOriginal ? 'none' : 'block' }}
                  width={640}
                  height={480}
                />
              </>
            ) : (
              <div className="viewer-placeholder">
                <p>No video loaded</p>
                <button onClick={handleImportVideo}>Import Video</button>
              </div>
            )}
          </div>
          {/* Playback controls */}
          <div className="playback-controls">
            {videoSrc && (
              <span className="status">
                {showOriginal ? 'BEFORE (Original)' : 'AFTER (Graded)'}
              </span>
            )}
          </div>
        </div>

        {/* Node Panel */}
        <div className="node-panel">
          <h2>Nodes</h2>
          <div className="node-list">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className={`node-item ${activeNodeId === node.id ? 'active' : ''}`}
                onClick={() => setActiveNodeId(node.id)}
              >
                <span className="node-name">Node {index + 1}</span>
                <button
                  className={`node-toggle ${node.enabled ? 'enabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodes(nodes.map(n =>
                      n.id === node.id ? { ...n, enabled: !n.enabled } : n
                    ));
                  }}
                >
                  {node.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
          {nodes.length < 3 && (
            <button
              className="btn-add-node"
              onClick={() => {
                const newNode = createDefaultNode(`node${nodes.length + 1}`);
                setNodes([...nodes, newNode]);
              }}
            >
              Add Node
            </button>
          )}
        </div>

        {/* Controls Panel */}
        <div className="controls-panel">
          <h2>Primary Controls - {activeNode?.id.replace('node', 'Node ')}</h2>

          <div className="control-section">
            <h3>Color Wheels</h3>
            <div className="color-wheels">
              <div className="wheel-group">
                <label>Lift (Shadows)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.lift[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, lift: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Gamma (Midtones)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.gamma[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, gamma: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Gain (Highlights)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.gain[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, gain: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="wheel-group">
                <label>Offset</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.offset[0] || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    const val = parseFloat(e.target.value);
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, offset: [val, val, val] }
                        : n
                    ));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="control-section">
            <h3>Basic Adjustments</h3>
            <div className="sliders">
              <div className="slider-group">
                <label>Contrast: {activeNode?.contrast.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.contrast || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, contrast: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Pivot: {activeNode?.pivot.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.pivot || 0.5}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, pivot: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Saturation: {activeNode?.saturation.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={activeNode?.saturation || 1}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, saturation: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Temperature: {activeNode?.temperature.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.temperature || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, temperature: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Tint: {activeNode?.tint.toFixed(2)}</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={activeNode?.tint || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, tint: parseFloat(e.target.value) }
                        : n
                    ));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="control-section">
            <h3>
              <label>
                <input
                  type="checkbox"
                  checked={activeNode?.qualifier.enabled || false}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, enabled: e.target.checked } }
                        : n
                    ));
                  }}
                />
                HSL Qualifier
              </label>
            </h3>
            <div className="sliders">
              <div className="slider-group">
                <label>Hue Center: {((activeNode?.qualifier.hueCenter || 0) * 180).toFixed(0)}°</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.qualifier.hueCenter || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, hueCenter: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Hue Range: {((activeNode?.qualifier.hueRange || 0.1) * 180).toFixed(0)}°</label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={activeNode?.qualifier.hueRange || 0.1}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, hueRange: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Sat Min: {(activeNode?.qualifier.satMin || 0).toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.qualifier.satMin || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, satMin: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Sat Max: {(activeNode?.qualifier.satMax || 1).toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.qualifier.satMax || 1}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, satMax: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Lum Min: {(activeNode?.qualifier.lumMin || 0).toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.qualifier.lumMin || 0}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, lumMin: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Lum Max: {(activeNode?.qualifier.lumMax || 1).toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activeNode?.qualifier.lumMax || 1}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, lumMax: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
              <div className="slider-group">
                <label>Softness: {(activeNode?.qualifier.softness || 0.05).toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={activeNode?.qualifier.softness || 0.05}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, qualifier: { ...n.qualifier, softness: parseFloat(e.target.value) } }
                        : n
                    ));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="control-section">
            <h3>Power Windows</h3>
            <div className="mask-controls">
              <label>
                <input
                  type="checkbox"
                  checked={activeNode?.masks.ellipse.enabled || false}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, enabled: e.target.checked } } }
                        : n
                    ));
                  }}
                />
                Ellipse
              </label>
              <div className="sliders">
                <div className="slider-group">
                  <label>Center X: {(activeNode?.masks.ellipse.centerX || 0.5).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeNode?.masks.ellipse.centerX || 0.5}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, centerX: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Center Y: {(activeNode?.masks.ellipse.centerY || 0.5).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeNode?.masks.ellipse.centerY || 0.5}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, centerY: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Radius X: {(activeNode?.masks.ellipse.radiusX || 0.2).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={activeNode?.masks.ellipse.radiusX || 0.2}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, radiusX: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Radius Y: {(activeNode?.masks.ellipse.radiusY || 0.15).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={activeNode?.masks.ellipse.radiusY || 0.15}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, radiusY: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Softness: {(activeNode?.masks.ellipse.softness || 0.05).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={activeNode?.masks.ellipse.softness || 0.05}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, ellipse: { ...n.masks.ellipse, softness: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mask-controls">
              <label>
                <input
                  type="checkbox"
                  checked={activeNode?.masks.rectangle.enabled || false}
                  onChange={(e) => {
                    if (!activeNode) return;
                    setNodes(nodes.map(n =>
                      n.id === activeNodeId
                        ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, enabled: e.target.checked } } }
                        : n
                    ));
                  }}
                />
                Rectangle
              </label>
              <div className="sliders">
                <div className="slider-group">
                  <label>Center X: {(activeNode?.masks.rectangle.centerX || 0.5).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeNode?.masks.rectangle.centerX || 0.5}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, centerX: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Center Y: {(activeNode?.masks.rectangle.centerY || 0.5).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeNode?.masks.rectangle.centerY || 0.5}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, centerY: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Width: {(activeNode?.masks.rectangle.width || 0.3).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.01"
                    value={activeNode?.masks.rectangle.width || 0.3}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, width: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Height: {(activeNode?.masks.rectangle.height || 0.2).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.01"
                    value={activeNode?.masks.rectangle.height || 0.2}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, height: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
                <div className="slider-group">
                  <label>Softness: {(activeNode?.masks.rectangle.softness || 0.05).toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={activeNode?.masks.rectangle.softness || 0.05}
                    onChange={(e) => {
                      if (!activeNode) return;
                      setNodes(nodes.map(n =>
                        n.id === activeNodeId
                          ? { ...n, masks: { ...n.masks, rectangle: { ...n.masks.rectangle, softness: parseFloat(e.target.value) } } }
                          : n
                      ));
                    }}
                  />
                </div>
              </div>

              {/* Tracking Controls */}
              {(activeNode?.masks.ellipse.enabled || activeNode?.masks.rectangle.enabled) && (
                <div className="tracking-controls">
                  <h4>Mask Tracking</h4>
                  <div className="tracking-buttons">
                    <button
                      className="btn-track"
                      onClick={trackForward}
                      disabled={!!trackingStatus}
                    >
                      Track Forward
                    </button>
                    <button
                      className="btn-track"
                      onClick={trackBackward}
                      disabled={!!trackingStatus}
                    >
                      Track Backward
                    </button>
                    <button
                      className="btn-track-clear"
                      onClick={clearTracking}
                      disabled={!!trackingStatus}
                    >
                      Clear
                    </button>
                  </div>
                  {activeNode?.tracking.keyframes.length > 0 && (
                    <div className="tracking-info">
                      <span>{activeNode.tracking.keyframes.length} keyframes</span>
                    </div>
                  )}
                  {trackingStatus && (
                    <div className="tracking-status">
                      {trackingStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;