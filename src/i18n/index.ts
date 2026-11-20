import { english } from "./en";

export type Locale = "es" | "en";

export const routes = [
	{ es: "/", en: "/en/" },
	{ es: "/vision", en: "/en/vision" },
	{ es: "/productos/livecook", en: "/en/products/livecook" },
	{ es: "/contactanos", en: "/en/contact" },
	{ es: "/aviso-legal", en: "/en/legal-notice" },
	{ es: "/privacidad", en: "/en/privacy" },
	{ es: "/proteccion-datos-formularios", en: "/en/data-protection" },
] as const;

const normalise = (path: string) => path.replace(/\/+$/, "") || "/";

export function getLocale(path: string): Locale {
	return /^\/en(?:\/|$)/.test(path) ? "en" : "es";
}

/** Localise known internal routes; leave assets, fragments and external links intact. */
export function localisePath(href: string, locale: Locale): string {
	if (!href.startsWith("/") || href.startsWith("//")) return href;
	const url = new URL(href, "https://local.invalid");
	const path = normalise(url.pathname);
	const route = routes.find((item) => normalise(item.es) === path || normalise(item.en) === path);
	return route ? `${route[locale]}${url.search}${url.hash}` : href;
}

export function createTranslator(locale: Locale) {
	return (text: string): string => locale === "en" ? english[text] ?? text : text;
}
