import Threads from './Threads';

export default function HeroBackgroundManager() {
	return (
		<div className="pointer-events-auto absolute inset-0 z-0 overflow-hidden">
			<div className="absolute inset-[-10%]">
				<Threads
					color="var(--hero-threads)"
					colorLight="var(--hero-threads-light)"
					backgroundColor="var(--background)"
					amplitude={1.95}
					distance={0}
					maxDpr={1.5}
					opacity={0.62}
					enableMouseInteraction
				/>
			</div>
		</div>
	);
}
