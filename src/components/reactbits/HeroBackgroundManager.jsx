import Threads from './Threads';

export default function HeroBackgroundManager() {
	return (
		<div className="pointer-events-auto absolute inset-0 z-0 overflow-hidden">
			<div className="absolute inset-[-10%]">
				<Threads
					color="var(--primary)"
					colorLight="var(--brand-200)"
					backgroundColor="var(--background)"
					amplitude={1.95}
					distance={0}
					opacity={0.62}
					enableMouseInteraction
				/>
			</div>
		</div>
	);
}
