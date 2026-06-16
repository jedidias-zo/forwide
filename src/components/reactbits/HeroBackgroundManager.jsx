import Threads from './Threads';

export default function HeroBackgroundManager() {
	return (
		<div className="pointer-events-auto absolute inset-0 z-0 overflow-hidden">
			<div className="absolute inset-[-10%] opacity-62">
				<Threads
					color={[1, 0.267, 0]}
					colorLight={[1, 0.698, 0.58]}
					amplitude={1.95}
					distance={0}
					enableMouseInteraction
				/>
			</div>
		</div>
	);
}
