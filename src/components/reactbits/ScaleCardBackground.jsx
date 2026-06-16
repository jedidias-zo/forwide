import LightRays from './LightRays';

export default function ScaleCardBackground() {
	return (
		<div className="pointer-events-auto absolute inset-0 overflow-hidden opacity-80">
			<LightRays
				raysOrigin="top-center"
				raysColor="#ffd0bd"
				raysSpeed={0.55}
				lightSpread={0.72}
				rayLength={1.25}
				pulsating
				fadeDistance={0.86}
				saturation={0.75}
				followMouse
				mouseInfluence={0.06}
				noiseAmount={0.035}
				distortion={0.03}
			/>
		</div>
	);
}
