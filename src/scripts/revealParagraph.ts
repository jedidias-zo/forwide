import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Preserve native editable text nodes; reveal the whole block instead of rebuilding its DOM. */
export function revealParagraph(element: HTMLElement): boolean {
	if (!element.matches("p, figcaption") && !element.querySelector("[data-bilingual-text]")) return false;
	if (element.dataset.paragraphRevealPrepared === "true") return true;
	element.dataset.paragraphRevealPrepared = "true";

	if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		gsap.fromTo(
			element,
			{ autoAlpha: 0, y: 14 },
			{
				autoAlpha: 1,
				y: 0,
				duration: 0.6,
				ease: "power3.out",
				clearProps: "opacity,visibility,transform",
				scrollTrigger: {
					trigger: element,
					start: "top 92%",
					once: true,
				},
			},
		);
	}

	return true;
}
