import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './ColorBends.css';

const MAX_COLORS = 8;

const fragmentShader = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
	float t = uTime * uSpeed;
	vec2 p = vUv * 2.0 - 1.0;
	p += uPointer * uParallax * 0.1;
	vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
	vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
	q /= max(uScale, 0.0001);
	q /= 0.5 + 0.2 * dot(q, q);
	q += 0.2 * cos(t) - 7.56;
	q += (uPointer - rp) * uMouseInfluence * 0.2;

	for (int j = 0; j < 5; j++) {
		if (j >= uIterations - 1) break;
		vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
		q += (rr - q) * 0.15;
	}

	vec3 col = vec3(0.0);
	float alpha = 1.0;

	if (uColorCount > 0) {
		vec2 s = q;
		vec3 sumCol = vec3(0.0);
		float cover = 0.0;
		for (int i = 0; i < MAX_COLORS; ++i) {
			if (i >= uColorCount) break;
			s -= 0.01;
			vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
			float kBelow = clamp(uWarpStrength, 0.0, 1.0);
			float kMix = pow(kBelow, 0.3);
			float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
			vec2 warped = s + (r - s) * kBelow * gain;
			float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
			float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
			float m = mix(m0, m1, kMix);
			float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
			sumCol += uColors[i] * w;
			cover = max(cover, w);
		}
		col = clamp(sumCol, 0.0, 1.0) * uIntensity;
		alpha = uTransparent > 0 ? cover : 1.0;
	}

	if (uNoise > 0.0001) {
		float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
		col += (n - 0.5) * uNoise;
	}

	vec3 rgb = uTransparent > 0 ? col * alpha : col;
	gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), alpha);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position, 1.0);
}
`;

const hexToVector = (hex) => {
	const h = hex.replace('#', '').trim();
	const values =
		h.length === 3
			? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
			: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

	return new THREE.Vector3(values[0] / 255, values[1] / 255, values[2] / 255);
};

export default function ColorBends({
	className = '',
	style,
	rotation = 90,
	autoRotate = 0,
	speed = 0.2,
	colors = [],
	transparent = true,
	scale = 1,
	frequency = 1,
	warpStrength = 1,
	mouseInfluence = 1,
	parallax = 0.5,
	noise = 0.15,
	iterations = 1,
	intensity = 1.5,
	bandWidth = 6,
}) {
	const containerRef = useRef(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return undefined;

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		const geometry = new THREE.PlaneGeometry(2, 2);
		const colorUniforms = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			transparent: true,
			premultipliedAlpha: true,
			uniforms: {
				uCanvas: { value: new THREE.Vector2(1, 1) },
				uTime: { value: 0 },
				uSpeed: { value: speed },
				uRot: { value: new THREE.Vector2(1, 0) },
				uColorCount: { value: 0 },
				uColors: { value: colorUniforms },
				uTransparent: { value: transparent ? 1 : 0 },
				uScale: { value: scale },
				uFrequency: { value: frequency },
				uWarpStrength: { value: warpStrength },
				uPointer: { value: new THREE.Vector2(0, 0) },
				uMouseInfluence: { value: mouseInfluence },
				uParallax: { value: parallax },
				uNoise: { value: noise },
				uIterations: { value: iterations },
				uIntensity: { value: intensity },
				uBandWidth: { value: bandWidth },
			},
		});

		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.setClearColor(0x000000, transparent ? 0 : 1);
		container.appendChild(renderer.domElement);

		const setColors = () => {
			const activeColors = colors.filter(Boolean).slice(0, MAX_COLORS).map(hexToVector);
			colorUniforms.forEach((vec, index) => {
				if (activeColors[index]) vec.copy(activeColors[index]);
				else vec.set(0, 0, 0);
			});
			material.uniforms.uColorCount.value = activeColors.length;
		};

		const resize = () => {
			const width = container.clientWidth || 1;
			const height = container.clientHeight || 1;
			renderer.setSize(width, height, false);
			material.uniforms.uCanvas.value.set(width, height);
		};

		const pointerTarget = new THREE.Vector2(0, 0);
		const pointerCurrent = new THREE.Vector2(0, 0);
		const handlePointerMove = (event) => {
			const rect = container.getBoundingClientRect();
			pointerTarget.set(((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1, -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1));
		};

		setColors();
		resize();
		container.addEventListener('pointermove', handlePointerMove);
		const observer = new ResizeObserver(resize);
		observer.observe(container);

		const clock = new THREE.Clock();
		let frame = 0;
		const loop = () => {
			const elapsed = clock.elapsedTime;
			const delta = clock.getDelta();
			pointerCurrent.lerp(pointerTarget, Math.min(1, delta * 8));
			const angle = (((rotation % 360) + autoRotate * elapsed) * Math.PI) / 180;
			material.uniforms.uTime.value = elapsed;
			material.uniforms.uRot.value.set(Math.cos(angle), Math.sin(angle));
			material.uniforms.uPointer.value.copy(pointerCurrent);
			renderer.render(scene, camera);
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			container.removeEventListener('pointermove', handlePointerMove);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
			if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
		};
	}, [autoRotate, bandWidth, colors, frequency, intensity, iterations, mouseInfluence, noise, parallax, rotation, scale, speed, transparent, warpStrength]);

	return <div ref={containerRef} className={`color-bends-container ${className}`} style={style} />;
}
