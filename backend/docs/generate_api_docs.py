"""Genera la documentación pública de la API en HTML y JSON a partir del contrato OpenAPI."""

import json
import sys
from pathlib import Path

# Definir rutas relativas basadas en la ubicación del script (backend/docs/)
DOCS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = DOCS_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

# Carpeta de salida para el HTML de la documentación
HTML_OUTPUT_DIR = DOCS_DIR / "documentacion-api-html"


def generate_html_docs() -> str:
    """Genera una página HTML moderna utilizando Swagger UI vinculada al json de OpenAPI."""
    return """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Documentación API - Fichapp</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js" charset="UTF-8"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: "../openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>
"""


def main() -> None:
    from main import app

    # Obtener el esquema OpenAPI desde FastAPI
    spec = app.openapi()
    
    # Asegurar que las carpetas de salida existan
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    HTML_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Guardar el contrato OpenAPI en JSON (en docs/openapi.json)
    openapi_path = DOCS_DIR / "openapi.json"
    openapi_path.write_text(
        json.dumps(spec, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # 2. Generar el archivo index.html en la carpeta de salida HTML
    html_path = HTML_OUTPUT_DIR / "index.html"
    html_path.write_text(generate_html_docs(), encoding="utf-8")

    print(f"¡Documentación generada con éxito!")
    print(f"- Esquema JSON: {openapi_path}")
    print(f"- Página HTML: {html_path}")
    print(f"Rutas procesadas: {len(spec.get('paths', {}))}, Esquemas: {len(spec.get('components', {}).get('schemas', {}))}")


if __name__ == "__main__":
    main()