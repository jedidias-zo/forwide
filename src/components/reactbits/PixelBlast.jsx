import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './PixelBlast.css';

const SHAPE_MAP = {
	square: 0,
	circle: 1,
	triangle: 2,
	diamond: 3,
};

const MAX_CLICKS = 10;

const vertexShader = `
void main() {
	gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int uShapeType;
uniform int uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;
uniform vec2 uPointerPos;
uniform float uPointerActive;
uniform float uHoverRadius;
uniform float uHoverIntensity;
uniform vec2 uClickPos[${MAX_CLICKS}];
uniform float uClickTimes[${MAX_CLICKS}];

out vec4 fragColor;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
	float total = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 5; i++) {
		total += noise(p) * amp;
		p *= 1.85;
		amp *= 0.55;
	}
	return total;
}

float shapeMask(vec2 uv, vec2 id, float coverage) {
	if (coverage <= 0.0) return 0.0;
	if (uShapeType == 1) {
		float d = length(uv - 0.5);
		return 1.0 - smoothstep(0.34 * coverage, 0.36 * coverage, d);
	}
	if (uShapeType == 2) {
		bool flip = mod(id.x + id.y, 2.0) > 0.5;
		if (flip) uv.x = 1.0 - uv.x;
		float edge = uv.y - coverage * (1.0 - uv.x);
		return 1.0 - smoothstep(-0.03, 0.03, edge);
	}
	if (uShapeType == 3) {
		return step(abs(uv.x - 0.5) + abs(uv.y - 0.5), 0.52 * coverage);
	}
	return step(0.08, coverage);
}

void main() {
	vec2 centered = gl_FragCoord.xy - uResolution * 0.5;
	vec2 id = floor(centered / uPixelSize);
	vec2 cellUv = fract(centered / uPixelSize);
	vec2 patternUv = id / max(uResolution.y / uPixelSize, 1.0) * uScale;
	float base = fbm(patternUv + vec2(uTime * 0.035, -uTime * 0.02));
	float coverage = smoothstep(0.42, 0.86, base + (uDensity - 1.0) * 0.2);

	if (uPointerActive > 0.5) {
		float pointerDistance = distance(gl_FragCoord.xy, uPointerPos);
		float blockRadius = uHoverRadius;
		float block = 1.0 - smoothstep(blockRadius * 0.42, blockRadius, pointerDistance);
		float gridPulse = step(0.38, hash(floor(id / 2.0) + floor(uTime * 4.0)));
		float blockTexture = max(gridPulse, smoothstep(0.35, 0.8, fbm(patternUv * 2.3 - uTime * 0.08)));
		coverage = max(coverage, block * blockTexture * uHoverIntensity);
	}

	for (int i = 0; i < ${MAX_CLICKS}; i++) {
		vec2 click = uClickPos[i];
		if (click.x < 0.0) continue;
		float age = max(uTime - uClickTimes[i], 0.0);
		float radius = age * uRippleSpeed * 480.0;
		float distanceToClick = distance(gl_FragCoord.xy, click);
		float ring = exp(-pow((distanceToClick - radius) / max(1.0, uRippleThickness * 300.0), 2.0));
		float burst = 1.0 - smoothstep(radius * 0.38, radius + uPixelSize * 16.0, distanceToClick);
		float blockNoise = step(0.28, hash(floor(id / 2.0) + float(i) * 31.0));
		coverage = max(coverage, ring * exp(-age * 0.9) * uRippleIntensity);
		coverage = max(coverage, burst * blockNoise * exp(-age * 1.15) * uRippleIntensity);
	}

	float jitter = hash(id + uTime) - 0.5;
	coverage *= 1.0 + jitter * uPixelJitter;

	float mask = shapeMask(cellUv, id, coverage);
	if (uEdgeFade > 0.0) {
		vec2 norm = gl_FragCoord.xy / uResolution;
		float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
		mask *= smoothstep(0.0, uEdgeFade, edge);
	}

	fragColor = vec4(uColor, mask);
}
`;

export default function PixelBlast({
	variant = 'circle',
	pixelSize = 6,
	color = '#FF6A33',
	className = '',
	style,
	patternScale = 3,
	patternDensity = 1.1,
	pixelSizeJitter = 0.45,
	enableRipples = true,
	rippleSpeed = 0.35,
	rippleThickness = 0.12,
	rippleIntensityScale = 1.4,
	hoverRadius = 190,
	hoverIntensity = 1.25,
	speed = 0.55,
	edgeFade = 0.18,
	transparent = true,
}) {
	const containerRef = useRef(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return undefined;

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.setClearColor(0x000000, transparent ? 0 : 1);
		container.appendChild(renderer.domElement);

		const uniforms = {
			uColor: { value: new THREE.Color(color) },
			uResolution: { value: new THREE.Vector2(1, 1) },
			uTime: { value: 0 },
			uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
			uScale: { value: patternScale },
			uDensity: { value: patternDensity },
			uPixelJitter: { value: pixelSizeJitter },
			uShapeType: { value: SHAPE_MAP[variant] ?? 1 },
			uEnableRipples: { value: enableRipples ? 1 : 0 },
			uRippleSpeed: { value: rippleSpeed },
			uRippleThickness: { value: rippleThickness },
			uRippleIntensity: { value: rippleIntensityScale },
			uEdgeFade: { value: edgeFade },
			uPointerPos: { value: new THREE.Vector2(-1, -1) },
			uPointerActive: { value: 0 },
			uHoverRadius: { value: hoverRadius },
			uHoverIntensity: { value: hoverIntensity },
			uClickPos: { value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) },
			uClickTimes: { value: new Float32Array(MAX_CLICKS) },
		};

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		const geometry = new THREE.PlaneGeometry(2, 2);
		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			glslVersion: THREE.GLSL3,
		});
		scene.add(new THREE.Mesh(geometry, material));

		const resize = () => {
			const width = container.clientWidth || 1;
			const height = container.clientHeight || 1;
			renderer.setSize(width, height, false);
			uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
			uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
		};

		let clickIndex = 0;
		const mapPointer = (event) => {
			const rect = renderer.domElement.getBoundingClientRect();
			const scaleX = renderer.domElement.width / rect.width;
			const scaleY = renderer.domElement.height / rect.height;
			return new THREE.Vector2((event.clientX - rect.left) * scaleX, (rect.height - (event.clientY - rect.top)) * scaleY);
		};

		const handlePointerDown = (event) => {
			const point = mapPointer(event);
			uniforms.uPointerPos.value.copy(point);
			uniforms.uPointerActive.value = 1;
			uniforms.uClickPos.value[clickIndex].copy(point);
			uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value;
			clickIndex = (clickIndex + 1) % MAX_CLICKS;
		};

		const handlePointerMove = (event) => {
			uniforms.uPointerPos.value.copy(mapPointer(event));
			uniforms.uPointerActive.value = 1;
		};

		const handlePointerLeave = () => {
			uniforms.uPointerActive.value = 0;
		};

		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(container);
		renderer.domElement.addEventListener('pointerdown', handlePointerDown, { passive: true });
		renderer.domElement.addEventListener('pointermove', handlePointerMove, { passive: true });
		renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

		const clock = new THREE.Clock();
		let frame = 0;
		const loop = () => {
			uniforms.uTime.value = clock.getElapsedTime() * speed;
			renderer.render(scene, camera);
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
			renderer.domElement.removeEventListener('pointermove', handlePointerMove);
			renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
			if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
		};
	}, [color, edgeFade, enableRipples, hoverIntensity, hoverRadius, patternDensity, patternScale, pixelSize, pixelSizeJitter, rippleIntensityScale, rippleSpeed, rippleThickness, speed, transparent, variant]);

	return <div ref={containerRef} className={`pixel-blast-container ${className}`} style={style} aria-label="PixelBlast interactive background" />;
}
