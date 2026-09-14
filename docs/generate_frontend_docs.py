"""Genera la guía Markdown y el sitio HTML multipágina del frontend."""

import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "mobile"
DOCS = ROOT / "docs"
HTML_DOCS = DOCS / "frontend-html"


def source_link(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def route_name(path: Path) -> str:
    relative = path.relative_to(MOBILE / "app").as_posix()
    relative = re.sub(r"/index\.tsx$", "", relative)
    relative = re.sub(r"\.tsx$", "", relative)
    return "/" + (relative or "/")


def collect_routes() -> list[tuple[str, str]]:
    return [
        (route_name(path), source_link(path))
        for path in sorted((MOBILE / "app").rglob("*.tsx"))
        if not path.name.startswith("_")
    ]


def collect_modules() -> list[tuple[str, int, str]]:
    modules = []
    modules_root = MOBILE / "src" / "modules"
    for directory in sorted(path for path in modules_root.iterdir() if path.is_dir()):
        files = list(directory.rglob("*.ts")) + list(directory.rglob("*.tsx"))
        if files:
            modules.append((directory.name, len(files), source_link(directory)))
    return modules


def collect_entries() -> list[tuple[str, str, str, str]]:
    entries = []
    pattern = re.compile(r"/\*\*(.*?)\*/\s*(?:export\s+)?(const|function|interface|type|class)\s+([\w$]+)", re.S)
    source_roots = [MOBILE / "app", MOBILE / "src"]
    paths = [path for source_root in source_roots for path in source_root.rglob("*.ts")]
    paths.extend(path for source_root in source_roots for path in source_root.rglob("*.tsx"))
    for path in sorted(paths):
        relative = source_link(path)
        text = path.read_text(encoding="utf-8")
        for comment, kind, name in pattern.findall(text):
            entries.append((relative, f"{kind} {name}", re.sub(r"\n\s*\* ?", "\n", comment).strip(), path))
    return entries


def page_slug(source: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", source).strip("-").lower() + ".html"


STYLE = """
:root{color-scheme:light;--ink:#18212f;--muted:#667085;--line:#d9e0e8;--paper:#fff;--wash:#f4f6f8;--navy:#132238;--accent:#b44a2d;--accent-wash:#fff1ec;font-family:Georgia,'Times New Roman',serif}*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font-size:16px;line-height:1.65}a{color:#8d341f;text-decoration:none}a:hover{text-decoration:underline}.top{background:var(--navy);color:#fff;padding:18px 28px;display:flex;align-items:center;gap:28px}.brand{font-size:1.45rem;font-weight:700;letter-spacing:.02em}.top small{color:#b9c4d3}.layout{display:grid;grid-template-columns:275px minmax(0,900px);max-width:1240px;margin:0 auto;min-height:calc(100vh - 70px)}aside{padding:30px 22px;border-right:1px solid var(--line);background:#eef1f4;position:sticky;top:0;height:calc(100vh - 70px);overflow:auto}aside h3{font:700 .75rem/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin:22px 0 8px}nav a{display:block;padding:5px 9px;border-radius:4px;font:14px/1.45 Arial,sans-serif;color:#344054}nav a:hover{background:#dfe5eb;text-decoration:none}.search{width:100%;border:1px solid #c5ced9;border-radius:4px;padding:9px 10px;background:#fff;font:14px Arial,sans-serif}.content{background:var(--paper);padding:54px clamp(24px,6vw,76px) 90px}h1,h2,h3{font-weight:700;line-height:1.2}h1{font-size:2.55rem;margin:0 0 14px;color:var(--navy)}h2{font-size:1.6rem;margin:48px 0 18px;border-bottom:1px solid var(--line);padding-bottom:9px}h3{font-size:1.15rem;margin:0 0 4px}.lead{font-size:1.16rem;color:#4b5565;max-width:720px}.eyebrow{font:700 .74rem Arial,sans-serif;text-transform:uppercase;letter-spacing:.12em;color:var(--accent)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:30px 0}.stat,.item{border:1px solid var(--line);padding:16px;background:#fff}.stat strong{display:block;font-size:1.8rem;color:var(--accent)}.stat span,.meta{font:13px Arial,sans-serif;color:var(--muted)}.item{margin:12px 0}.item code,.path,code{font-family:'Cascadia Code',Consolas,monospace;font-size:.88em}.path{color:var(--muted);margin-bottom:16px}.entry{border-top:1px solid var(--line);padding:22px 0}.entry pre{white-space:pre-wrap;margin:10px 0 0;padding:14px;background:#f7f8fa;border-left:3px solid #d9a08f;font:14px/1.6 'Cascadia Code',Consolas,monospace;color:#344054}.tag{display:inline-block;background:var(--accent-wash);color:#8d341f;padding:2px 7px;margin-right:7px;font:12px Arial,sans-serif;border-radius:3px}@media(max-width:760px){.layout{display:block}aside{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}.content{padding:34px 22px 60px}h1{font-size:2rem}.top{padding:15px 18px}}
"""


def navigation(current: str, entries: list[tuple[str, str, str, str]], modules: list[tuple[str, int, str]]) -> str:
    module_links = "".join(f'<a href="modules.html#{html.escape(name)}">{html.escape(name)}</a>' for name, _, _ in modules)
    return f'''<aside><input class="search" type="search" placeholder="Buscar en la documentación" data-search><h3>Guía</h3><nav><a href="index.html">Inicio</a><a href="architecture.html">Arquitectura</a><a href="routes.html">Rutas</a><a href="modules.html">Módulos</a></nav><h3>Módulos</h3><nav>{module_links}</nav></aside>'''


def shell(title: str, content: str, current: str, entries, modules) -> str:
    return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} · Fichapp</title><style>{STYLE}</style></head><body><header class="top"><div class="brand">Fichapp</div><small>Documentación del frontend</small></header><div class="layout">{navigation(current, entries, modules)}<main class="content">{content}</main></div><script>const q=document.querySelector('[data-search]');q?.addEventListener('input',e=>{{const value=e.target.value.toLowerCase();document.querySelectorAll('.item,.entry').forEach(el=>el.hidden=value&&!el.textContent.toLowerCase().includes(value))}});</script></body></html>'''


def generate_html(package, routes, modules, entries) -> None:
    if HTML_DOCS.exists():
        shutil.rmtree(HTML_DOCS)
    HTML_DOCS.mkdir(parents=True)
    stats = f'<div class="grid"><div class="stat"><strong>{len(routes)}</strong><span>rutas Expo Router</span></div><div class="stat"><strong>{len(modules)}</strong><span>módulos de dominio</span></div><div class="stat"><strong>{len(entries)}</strong><span>símbolos documentados</span></div></div>'
    intro = '<p class="eyebrow">Guía técnica</p><h1>Frontend de Fichapp</h1><p class="lead">Referencia navegable de la aplicación móvil Expo y React Native. Explora la arquitectura, las pantallas y los módulos por dominio.</p>' + stats + '<h2>Empieza aquí</h2><div class="item"><h3><a href="architecture.html">Arquitectura</a></h3><p>Capas principales, sesión, navegación y responsabilidades del frontend.</p></div><div class="item"><h3><a href="routes.html">Rutas</a></h3><p>Listado de pantallas y grupos de navegación de Expo Router.</p></div><div class="item"><h3><a href="modules.html">Módulos</a></h3><p>Referencia de servicios, tipos y componentes organizados por dominio.</p></div>'
    (HTML_DOCS / "index.html").write_text(shell("Inicio", intro, "index", entries, modules), encoding="utf-8")
    architecture = '<p class="eyebrow">Conceptos</p><h1>Arquitectura</h1><p class="lead">La aplicación separa navegación, dominio, servicios y UI compartida para mantener las pantallas pequeñas y los contratos explícitos.</p><h2>Capas</h2>' + ''.join(f'<div class="item"><h3><code>{html.escape(name)}</code></h3><p>{html.escape(description)}</p></div>' for name, description in [("mobile/app/", "Rutas de Expo Router y pantallas de la aplicación."),("mobile/src/modules/", "Módulos por dominio con servicios API, tipos y componentes."),("mobile/src/service/api/", "Cliente HTTP y configuración de comunicación con FastAPI."),("mobile/src/shared/", "Componentes y superficies de UI reutilizables."),("mobile/src/notifications/", "Integración de notificaciones push."),("mobile/assets/", "Imágenes, iconos, animaciones y vídeo.")]) + '<h2>Sesión y roles</h2><p><code>ProveedorSesion</code> centraliza la sesión, la empresa seleccionada y el contexto laboral activo. La protección global vive en <code>mobile/app/_layout.tsx</code> y la visibilidad de pestañas en <code>mobile/app/(tabs)/_layout.tsx</code>.</p>'
    (HTML_DOCS / "architecture.html").write_text(shell("Arquitectura", architecture, "architecture", entries, modules), encoding="utf-8")
    route_content = '<p class="eyebrow">Navegación</p><h1>Rutas</h1><p class="lead">Pantallas detectadas en <code>mobile/app/</code>.</p>' + ''.join(f'<div class="item"><h3><code>{html.escape(route)}</code></h3><p class="path">{html.escape(path)}</p></div>' for route, path in routes)
    (HTML_DOCS / "routes.html").write_text(shell("Rutas", route_content, "routes", entries, modules), encoding="utf-8")
    by_source = {}
    for source, symbol, comment, _ in entries:
        by_source.setdefault(source, []).append((symbol, comment))
    module_items = []
    for name, count, path in modules:
        file_links = []
        prefix = f"mobile/src/modules/{name}/"
        for source in sorted(source_name for source_name in by_source if source_name.startswith(prefix)):
            file_links.append(f'<a href="{page_slug(source)}">{html.escape(Path(source).name)}</a>')
        links = " · ".join(file_links) or "Sin comentarios TSDoc detectados"
        module_items.append(f'<div class="item" id="{html.escape(name)}"><h3>{html.escape(name)}</h3><p>{count} archivos TypeScript/TSX · <code>{html.escape(path)}</code></p><p class="meta">{links}</p></div>')
    module_content = '<p class="eyebrow">Dominio</p><h1>Módulos</h1><p class="lead">Cada módulo agrupa una capacidad funcional y sus contratos TypeScript.</p>' + ''.join(module_items)
    (HTML_DOCS / "modules.html").write_text(shell("Módulos", module_content, "modules", entries, modules), encoding="utf-8")
    for source, source_entries in by_source.items():
        body = f'<p class="eyebrow">Referencia de código</p><h1>{html.escape(Path(source).name)}</h1><p class="path">{html.escape(source)}</p>' + ''.join(f'<article class="entry"><h3><span class="tag">{html.escape(symbol.split()[0])}</span>{html.escape(symbol.split(maxsplit=1)[1])}</h3><pre>{html.escape(comment)}</pre></article>' for symbol, comment in source_entries)
        (HTML_DOCS / page_slug(source)).write_text(shell(Path(source).name, body, "source", entries, modules), encoding="utf-8")


def render_markdown(package, routes, modules) -> str:
    lines = ["# Documentación del frontend", "", "Documento generado automáticamente desde la estructura de `mobile/`.", "No edites este archivo manualmente; ejecuta `python docs/generate_frontend_docs.py`.", "", f"- Aplicación: `{package.get('name', 'N/D')}`", f"- Expo: `{package.get('dependencies', {}).get('expo', 'N/D')}`", f"- React Native: `{package.get('dependencies', {}).get('react-native', 'N/D')}`", f"- Rutas detectadas: `{len(routes)}`", f"- Módulos detectados: `{len(modules)}`", "", "## Rutas", ""]
    lines.extend(f"- `{route}`: `{path}`" for route, path in routes)
    lines.extend(["", "## Módulos de dominio", ""])
    lines.extend(f"- `{name}`: {count} archivos TypeScript/TSX." for name, count, _ in modules)
    lines.extend(["", "## Regeneración", "", "```bash", "python docs/generate_frontend_docs.py", "```", ""])
    return "\n".join(lines)


def main() -> None:
    package = json.loads((MOBILE / "package.json").read_text(encoding="utf-8"))
    routes, modules, entries = collect_routes(), collect_modules(), collect_entries()
    (DOCS / "FRONTEND.md").write_text(render_markdown(package, routes, modules), encoding="utf-8")
    generate_html(package, routes, modules, entries)
    print(f"Documentación frontend generada: {len(routes)} rutas, {len(modules)} módulos, {len(entries)} símbolos")


if __name__ == "__main__":
    main()