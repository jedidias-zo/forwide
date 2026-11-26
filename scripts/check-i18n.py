"""Check the built bilingual site without extra dependencies."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "dist"
PAIRS = {
    "/": ("/en/", "WE CREATE TECHNOLOGY.", "CREAMOS TECNOLOGÍA."),
    "/vision": ("/en/vision", "What is Forwide?", "¿Qué es Forwide?"),
    "/productos/livecook": ("/en/products/livecook", "Discover LiveCook", "Conocer LiveCook"),
    "/contactanos": ("/en/contact", "General support", "Soporte general"),
    "/aviso-legal": ("/en/legal-notice", "Legal notice", "Aviso legal"),
    "/privacidad": ("/en/privacy", "Privacy policy", "Política de privacidad"),
    "/proteccion-datos-formularios": ("/en/data-protection", "Data protection", "Protección de datos"),
}


class Page(HTMLParser):
    def __init__(self, route):
        super().__init__()
        self.language = None
        self.anchors = []
        self.alternates = {}
        self.ids = set()
        self.text = []
        self.localized_attributes = []
        self.skip = 0
        self.feed((ROOT / route.strip("/") / "index.html").read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.localized_attributes.extend(value for name, value in attrs.items() if name in ("alt", "aria-label", "placeholder") and value)
        if tag == "html":
            self.language = attrs.get("lang")
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "a":
            self.anchors.append(attrs)
        if tag == "link" and attrs.get("rel") == "alternate":
            self.alternates[attrs["hreflang"]] = attrs["href"]
        if "id" in attrs:
            self.ids.add(attrs["id"])

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)


pages = {}
for spanish, (english, english_copy, spanish_copy) in PAIRS.items():
    for route, language, copy in ((spanish, "es", spanish_copy), (english, "en", english_copy)):
        page = pages[route] = Page(route)
        assert page.language == language, (route, "HTML language")
        text = " ".join(page.text)
        assert copy in text, (route, "Missing translated copy", copy)
        assert page.alternates == {"es": spanish, "en": english, "x-default": spanish}, (route, "Alternates")
        switches = {a.get("hreflang"): a for a in page.anchors if a.get("hreflang")}
        target_language = "es" if language == "en" else "en"
        target_route = spanish if target_language == "es" else english
        assert set(switches) == {target_language}, (route, "Single language switch")
        assert switches[target_language]["href"] == target_route, (route, "Equivalent page switch")
        assert sum(a.get("aria-current") == "page" for a in page.anchors) == (0 if "legal" in english or english.endswith(("privacy", "data-protection")) else 1), (route, "Active navigation")
        if language == "en":
            assert not re.search(r"[áéíóúñ¿]", text.replace("Español", "")), (route, "Untranslated Spanish text")
            assert not any(re.search(r"[áéíóúñ¿]", value) for value in page.localized_attributes if value != "Español"), (route, "Untranslated image description or accessibility label")
            assert not any(a.get("href", "").startswith("/") and not a["href"].startswith("/en") and a.get("hreflang") != "es" for a in page.anchors), (route, "Navigation leaves English")

for route, page in pages.items():
    for anchor in page.anchors:
        href = anchor.get("href", "")
        if href.startswith("/") and not href.startswith("//"):
            path, _, fragment = href.partition("#")
            path = path.split("?", 1)[0]
            target = ROOT / path.strip("/") / "index.html"
            assert target.is_file(), (route, "Broken local link", href)
            if fragment:
                assert fragment in Page(path).ids, (route, "Broken fragment", href)
        elif href.startswith("#") and len(href) > 1:
            assert href[1:] in page.ids, (route, "Broken fragment", href)

print(f"Passed: {len(pages)} pages, translations, metadata, navigation and language switches.")
