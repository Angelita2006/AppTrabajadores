"""Genera la documentación pública de la API a partir del contrato OpenAPI."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "api" / "backend"
sys.path.insert(0, str(BACKEND))


def render_markdown(spec: dict) -> str:
    lines = [
        "# API de Fichapp",
        "",
        "Documento generado automáticamente desde el contrato OpenAPI de FastAPI.",
        "No edites este archivo manualmente; ejecuta `python docs/generate_api_docs.py`.",
        "",
        f"- Versión: `{spec.get('info', {}).get('version', 'N/D')}`",
        f"- Endpoints: `{sum(len(item) for item in spec.get('paths', {}).values())}`",
        f"- Esquemas: `{len(spec.get('components', {}).get('schemas', {}))}`",
        "",
        "## Índice de endpoints",
        "",
    ]

    for path, operations in sorted(spec.get("paths", {}).items()):
        for method, operation in sorted(operations.items()):
            if method not in {"get", "post", "put", "patch", "delete", "options", "head"}:
                continue
            tags = ", ".join(operation.get("tags", [])) or "Sin categoría"
            summary = operation.get("summary", "Sin resumen")
            anchor = f"{method}-{path.strip('/').replace('/', '-').replace('{', '').replace('}', '')}"
            lines.append(f"- [{method.upper()} `{path}`](#{anchor}) - {summary} ({tags})")

    lines.append("")
    lines.append("## Detalle")
    lines.append("")

    for path, operations in sorted(spec.get("paths", {}).items()):
        for method, operation in sorted(operations.items()):
            if method not in {"get", "post", "put", "patch", "delete", "options", "head"}:
                continue
            anchor = f"{method}-{path.strip('/').replace('/', '-').replace('{', '').replace('}', '')}"
            lines.extend([
                f"### <a id=\"{anchor}\"></a>{method.upper()} `{path}`",
                "",
                f"**{operation.get('summary', 'Sin resumen')}**",
                "",
                operation.get("description", "Sin descripción adicional.").strip(),
                "",
            ])
            parameters = operation.get("parameters", [])
            if parameters:
                lines.extend(["Parámetros:", ""])
                for parameter in parameters:
                    required = "obligatorio" if parameter.get("required") else "opcional"
                    schema = parameter.get("schema", {}).get("type", "objeto")
                    lines.append(f"- `{parameter.get('name')}` ({parameter.get('in')}, {schema}, {required})")
                lines.append("")
            request_body = operation.get("requestBody")
            if request_body:
                content_types = ", ".join(request_body.get("content", {}).keys())
                lines.extend([f"Cuerpo: `{content_types or 'N/D'}`", ""])
            responses = operation.get("responses", {})
            if responses:
                lines.extend(["Respuestas:", ""])
                for code, response in responses.items():
                    lines.append(f"- `{code}`: {response.get('description', 'Sin descripción')}")
                lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    from main import app

    spec = app.openapi()
    docs_dir = ROOT / "docs"
    (docs_dir / "openapi.json").write_text(
        json.dumps(spec, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (docs_dir / "API.md").write_text(render_markdown(spec), encoding="utf-8")
    print(f"Documentación generada: {len(spec.get('paths', {}))} rutas, {len(spec.get('components', {}).get('schemas', {}))} esquemas")


if __name__ == "__main__":
    main()