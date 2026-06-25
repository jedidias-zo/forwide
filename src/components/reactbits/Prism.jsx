import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import './Prism.css';

export default function Prism({
	height = 3.5,
	baseWidth = 5.5,
	animationType = 'rotate',
	glow = 1,
	offset = { x: 0, y: 0 },
	noise = 0.5,
	transparent = true,
	scale = 3.6,
	hueShift = 0,
	colorFrequency = 1,
	hoverStrength = 2,
	inertia = 0.05,
	bloom = 1,
	suspendWhenOffscreen = false,
	timeScale = 0.5,
}) {
	const containerRef = useRef(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return undefined;

		const prismHeight = Math.max(0.001, height);
		const baseHalf = Math.max(0.001, baseWidth) * 0.5;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const renderer = new Renderer({ dpr, alpha: transparent, antialias: false });
		const { gl } = renderer;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.BLEND);

		Object.assign(gl.canvas.style, {
			position: 'absolute',
			inset: '0',
			width: '100%',
			height: '100%',
			display: 'block',
		});
		container.appendChild(gl.canvas);

		const vertex = `
			attribute vec2 position;
			void main() {
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`;

		const fragment = `
			precision highp float;

			uniform vec2 iResolution;
			uniform float iTime;
			uniform float uHeight;
			uniform float uBaseHalf;
			uniform mat3 uRot;
			uniform int uUseBaseWobble;
			uniform float uGlow;
			uniform vec2 uOffsetPx;
			uniform float uNoise;
			uniform float uSaturation;
			uniform float uScale;
			uniform float uHueShift;
			uniform float uColorFreq;
			uniform float uBloom;
			uniform vec3 uBrandDark;
			uniform vec3 uBrand;
			uniform vec3 uBrandLight;
			uniform vec3 uBrandCream;
			uniform float uCenterShift;
			uniform float uInvBaseHalf;
			uniform float uInvHeight;
			uniform float uMinAxis;
			uniform float uPxScale;
			uniform float uTimeScale;

			vec4 tanh4(vec4 x) {
				vec4 e2x = exp(2.0 * x);
				return (e2x - 1.0) / (e2x + 1.0);
			}

			float rand(vec2 co) {
				return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
			}

			float sdOctaAnisoInv(vec3 p) {
				vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
				float m = q.x + q.y + q.z - 1.0;
				return m * uMinAxis * 0.5773502691896258;
			}

			float sdPyramidUpInv(vec3 p) {
				float oct = sdOctaAnisoInv(p);
				float halfSpace = -p.y;
				return max(oct, halfSpace);
			}

			mat3 hueRotation(float a) {
				float c = cos(a), s = sin(a);
				mat3 W = mat3(0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114);
				mat3 U = mat3(0.701, -0.587, -0.114, -0.299, 0.413, -0.114, -0.300, -0.588, 0.886);
				mat3 V = mat3(0.168, -0.331, 0.500, 0.328, 0.035, -0.500, -0.497, 0.296, 0.201);
				return W + U * c + V * s;
			}

			void main() {
				vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
				float z = 5.0;
				float d = 0.0;
				vec3 p;
				vec4 o = vec4(0.0);
				mat2 wob = mat2(1.0);

				if (uUseBaseWobble == 1) {
					float t = iTime * uTimeScale;
					float c0 = cos(t + 0.0);
					float c1 = cos(t + 33.0);
					float c2 = cos(t + 11.0);
					wob = mat2(c0, c1, c2, c0);
				}

				for (int i = 0; i < 100; i++) {
					p = vec3(f, z);
					p.xz = p.xz * wob;
					p = uRot * p;
					vec3 q = p;
					q.y += uCenterShift;
					d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
					z -= d;
					o += (sin((p.y + z) * uColorFreq + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
				}

				o = tanh4(o * o * (uGlow * uBloom) / 1e5);
				vec3 col = o.rgb;
				col += (rand(gl_FragCoord.xy + vec2(iTime)) - 0.5) * uNoise;
				col = clamp(col, 0.0, 1.0);
				float luminance = dot(col, vec3(0.2126, 0.7152, 0.0722));
				col = clamp(mix(vec3(luminance), col, uSaturation), 0.0, 1.0);
				if (abs(uHueShift) > 0.0001) col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
				float band = clamp((col.r + col.g * 0.55 + col.b * 0.2) / 1.75, 0.0, 1.0);
				vec3 brandRamp = mix(uBrandDark, uBrand, smoothstep(0.08, 0.48, band));
				brandRamp = mix(brandRamp, uBrandLight, smoothstep(0.42, 0.74, band));
				brandRamp = mix(brandRamp, uBrandCream, smoothstep(0.72, 1.0, band));
				col = mix(brandRamp, vec3(luminance), 0.08);
				gl_FragColor = vec4(col, o.a);
			}
		`;

		const geometry = new Triangle(gl);
		const resolution = new Float32Array(2);
		const offsetPx = new Float32Array(2);
		const rotationMatrix = new Float32Array(9);
		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				iResolution: { value: resolution },
				iTime: { value: 0 },
				uHeight: { value: prismHeight },
				uBaseHalf: { value: baseHalf },
				uUseBaseWobble: { value: animationType === 'rotate' ? 1 : 0 },
				uRot: { value: rotationMatrix },
				uGlow: { value: Math.max(0, glow) },
				uOffsetPx: { value: offsetPx },
				uNoise: { value: Math.max(0, noise) },
				uSaturation: { value: transparent ? 1.5 : 1 },
				uScale: { value: Math.max(0.001, scale) },
				uHueShift: { value: hueShift || 0 },
				uColorFreq: { value: Math.max(0, colorFrequency || 1) },
				uBloom: { value: Math.max(0, bloom || 1) },
				uBrandDark: { value: [0.55, 0.13, 0.03] },
				uBrand: { value: [1.0, 0.267, 0.0] },
				uBrandLight: { value: [1.0, 0.541, 0.361] },
				uBrandCream: { value: [0.953, 0.937, 0.894] },
				uCenterShift: { value: prismHeight * 0.25 },
				uInvBaseHalf: { value: 1 / baseHalf },
				uInvHeight: { value: 1 / prismHeight },
				uMinAxis: { value: Math.min(baseHalf, prismHeight) },
				uPxScale: { value: 1 },
				uTimeScale: { value: Math.max(0, timeScale || 1) },
			},
		});
		const mesh = new Mesh(gl, { geometry, program });

		const resize = () => {
			const width = container.clientWidth || 1;
			const heightPx = container.clientHeight || 1;
			renderer.setSize(width, heightPx);
			resolution[0] = gl.drawingBufferWidth;
			resolution[1] = gl.drawingBufferHeight;
			offsetPx[0] = (offset?.x ?? 0) * dpr;
			offsetPx[1] = (offset?.y ?? 0) * dpr;
			program.uniforms.uPxScale.value = 1 / ((gl.drawingBufferHeight || 1) * 0.1 * Math.max(0.001, scale));
		};
		const observer = new ResizeObserver(resize);
		observer.observe(container);
		resize();

		const setMatrix = (yawY, pitchX, rollZ) => {
			const cy = Math.cos(yawY);
			const sy = Math.sin(yawY);
			const cx = Math.cos(pitchX);
			const sx = Math.sin(pitchX);
			const cz = Math.cos(rollZ);
			const sz = Math.sin(rollZ);

			rotationMatrix[0] = cy * cz + sy * sx * sz;
			rotationMatrix[1] = cx * sz;
			rotationMatrix[2] = -sy * cz + cy * sx * sz;
			rotationMatrix[3] = -cy * sz + sy * sx * cz;
			rotationMatrix[4] = cx * cz;
			rotationMatrix[5] = sy * sz + cy * sx * cz;
			rotationMatrix[6] = sy * cx;
			rotationMatrix[7] = -sx;
			rotationMatrix[8] = cy * cx;
			program.uniforms.uRot.value = rotationMatrix;
		};

		let frame = 0;
		let yaw = 0;
		let pitch = 0;
		let roll = 0;
		let targetYaw = 0;
		let targetPitch = 0;
		const start = performance.now();
		const pointer = { x: 0, y: 0, inside: true };
		const random = () => Math.random();
		const wobbleX = 0.3 + random() * 0.6;
		const wobbleY = 0.2 + random() * 0.7;
		const wobbleZ = 0.1 + random() * 0.5;
		const phaseX = random() * Math.PI * 2;
		const phaseZ = random() * Math.PI * 2;
		const lerp = (a, b, amount) => a + (b - a) * amount;

		const handlePointerMove = (event) => {
			const centerX = window.innerWidth * 0.5;
			const centerY = window.innerHeight * 0.5;
			pointer.x = Math.max(-1, Math.min(1, (event.clientX - centerX) / centerX));
			pointer.y = Math.max(-1, Math.min(1, (event.clientY - centerY) / centerY));
			pointer.inside = true;
		};
		const handlePointerLeave = () => {
			pointer.inside = false;
		};
		if (animationType === 'hover') {
			window.addEventListener('pointermove', handlePointerMove, { passive: true });
			window.addEventListener('mouseleave', handlePointerLeave);
			window.addEventListener('blur', handlePointerLeave);
		}

		const render = (time) => {
			const elapsed = (time - start) * 0.001;
			program.uniforms.iTime.value = elapsed;

			if (animationType === 'hover') {
				targetYaw = (pointer.inside ? -pointer.x : 0) * 0.6 * Math.max(0, hoverStrength || 1);
				targetPitch = (pointer.inside ? pointer.y : 0) * 0.6 * Math.max(0, hoverStrength || 1);
				yaw = lerp(yaw, targetYaw, Math.max(0, Math.min(1, inertia || 0.12)));
				pitch = lerp(pitch, targetPitch, Math.max(0, Math.min(1, inertia || 0.12)));
				roll = lerp(roll, 0, 0.1);
				setMatrix(yaw, pitch, roll);
			} else if (animationType === '3drotate') {
				const scaled = elapsed * Math.max(0, timeScale || 1);
				setMatrix(scaled * wobbleY, Math.sin(scaled * wobbleX + phaseX) * 0.6, Math.sin(scaled * wobbleZ + phaseZ) * 0.5);
			} else {
				setMatrix(0, 0, 0);
			}

			renderer.render({ scene: mesh });
			frame = requestAnimationFrame(render);
		};

		let intersectionObserver;
		if (suspendWhenOffscreen) {
			intersectionObserver = new IntersectionObserver((entries) => {
				const isVisible = entries.some((entry) => entry.isIntersecting);
				if (isVisible && !frame) frame = requestAnimationFrame(render);
				if (!isVisible && frame) {
					cancelAnimationFrame(frame);
					frame = 0;
				}
			});
			intersectionObserver.observe(container);
		}
		frame = requestAnimationFrame(render);

		return () => {
			if (frame) cancelAnimationFrame(frame);
			observer.disconnect();
			intersectionObserver?.disconnect();
			if (animationType === 'hover') {
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('mouseleave', handlePointerLeave);
				window.removeEventListener('blur', handlePointerLeave);
			}
			if (gl.canvas.parentElement === container) container.removeChild(gl.canvas);
		};
	}, [animationType, baseWidth, bloom, colorFrequency, glow, height, hoverStrength, inertia, noise, offset?.x, offset?.y, scale, suspendWhenOffscreen, timeScale, transparent, hueShift]);

	return <div className="prism-container" ref={containerRef} />;
}
