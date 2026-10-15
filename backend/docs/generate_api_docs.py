"""Genera documentación HTML estática desde el contrato OpenAPI de Fichapp.

Uso desde la carpeta ``backend``::

    python docs/generate_api_docs.py

El HTML se guarda en ``backend/docs/documentacion_api.html`` y contiene el
contrato OpenAPI embebido, por lo que no necesita Swagger CDN ni conexión externa.
"""

import json
import sys
from pathlib import Path
from typing import Any


DOCS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = DOCS_DIR.parent
OUTPUT_HTML = DOCS_DIR / "documentacion_api.html"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def build_documentation_metadata(app: Any, spec: dict[str, Any]) -> None:
    """Añade docstrings de handlers al OpenAPI sin modificar las rutas de la app."""
    operations = spec.get("paths", {})
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None) or set()
        endpoint = getattr(route, "endpoint", None)
        docstring = getattr(endpoint, "__doc__", None)
        if not path or not docstring or path not in operations:
            continue

        for method in methods:
            operation = operations[path].get(method.lower())
            if operation is not None:
                operation["x-fichapp-handler-docstring"] = docstring.strip()

    spec["x-fichapp-business-overview"] = [
        {
            "title": "Acceso y contexto de empresa",
            "text": (
                "La API aplica autenticación y permisos en sus endpoints. En las "
                "operaciones multiempresa, Empresa-ID selecciona el contexto de "
                "trabajo; esa cabecera no concede acceso por sí sola. El backend "
                "debe comprobar la relación del usuario y los permisos antes de "
                "devolver o modificar datos."
            ),
        },
        {
            "title": "Registro horario y correcciones",
            "text": (
                "Los fichajes son registros de jornada y deben conservar su "
                "integridad. Las rectificaciones se tramitan mediante los flujos "
                "de corrección disponibles, en lugar de tratar un fichaje como "
                "un dato ordinario que se puede sobrescribir o borrar. Consulta "
                "las operaciones de fichajes y correcciones para conocer sus "
                "requisitos y estados concretos."
            ),
        },
        {
            "title": "Organización laboral",
            "text": (
                "Empresas, centros de trabajo, departamentos, trabajadores, "
                "contratos, calendarios, turnos, asignaciones y ausencias "
                "conforman los datos relacionados que usa la API. Las relaciones "
                "y validaciones exactas se describen en cada endpoint y en sus "
                "esquemas de entrada y respuesta."
            ),
        },
        {
            "title": "Gestorías, licencias y permisos",
            "text": (
                "La API incluye operaciones para empresas, gestorías, empresas "
                "vinculadas, licencias, usuarios y roles. El acceso disponible "
                "depende de la identidad autenticada, las relaciones activas y "
                "los permisos del endpoint; no se debe inferir acceso global a "
                "partir de pertenecer a una gestoría."
            ),
        },
        {
            "title": "Auditoría y archivos",
            "text": (
                "Las operaciones relevantes pueden generar eventos de auditoría. "
                "Firmas, justificantes, fotos y documentos se gestionan mediante "
                "rutas protegidas; sus rutas internas no sustituyen la autorización "
                "del endpoint de descarga."
            ),
        },
    ]


def render_html(spec: dict[str, Any]) -> str:
    """Crea una página autocontenida que presenta operaciones y esquemas OpenAPI."""
    payload = json.dumps(spec, ensure_ascii=False, separators=(",", ":"))
    # Evita que texto controlado por descripciones termine cerrando el elemento script.
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")

    return r'''<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Documentación de la API · Fichapp</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#18212f;background:#f4f6fa;font-synthesis:none;text-rendering:optimizeLegibility;--blue:#2457d6;--line:#dbe1eb;--muted:#536176}
    *{box-sizing:border-box}body{margin:0}a{color:var(--blue)}button,input{font:inherit}.layout{max-width:1420px;margin:auto;padding:28px 24px 72px}.hero{background:linear-gradient(130deg,#152b59,#2457d6);color:#fff;padding:34px;border-radius:18px;box-shadow:0 12px 32px #14284a24}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.76rem;font-weight:700;opacity:.8}.hero h1{margin:.4rem 0;font-size:clamp(2rem,5vw,3.4rem)}.hero p{max-width:850px;line-height:1.65;color:#e4ebff}.meta{display:flex;gap:10px;flex-wrap:wrap}.pill{border:1px solid #ffffff55;border-radius:999px;padding:6px 11px;font-size:.85rem}.columns{display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;margin-top:24px}.side{align-self:start;position:sticky;top:16px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;max-height:calc(100vh - 32px);overflow:auto}.side h2{font-size:.9rem;margin:0 0 12px}.side a{display:block;text-decoration:none;padding:7px 4px;font-size:.88rem}.content{min-width:0}.panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:18px}.panel h2{margin:0 0 12px}.intro{line-height:1.65;color:#344156}.business{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.business article{border:1px solid var(--line);border-radius:12px;padding:16px}.business h3{font-size:1rem;margin:0 0 8px}.business p{color:#43516a;line-height:1.55;margin:0;font-size:.92rem}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.toolbar input{flex:1;min-width:230px;padding:11px 13px;border:1px solid var(--line);border-radius:9px;background:#fff;color:inherit}.toolbar select{padding:11px;border:1px solid var(--line);border-radius:9px;background:#fff;color:inherit}.count{color:var(--muted);font-size:.9rem}.tag-title{padding:8px 0;border-bottom:1px solid var(--line);margin:24px 0 12px}.operation{border:1px solid var(--line);border-radius:11px;margin:10px 0;overflow:hidden;background:#fff}.operation summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:14px}.operation summary::-webkit-details-marker{display:none}.method{font-size:.76rem;min-width:72px;text-align:center;font-weight:800;color:#fff;border-radius:6px;padding:6px 8px}.GET{background:#167a55}.POST{background:#2457d6}.PUT,.PATCH{background:#a26408}.DELETE{background:#bb3445}.path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.summary-text{font-weight:650}.op-body{padding:0 16px 18px}.op-body p{line-height:1.6}.muted{color:var(--muted)}.subheading{font-size:.95rem;margin:18px 0 8px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid var(--line)}th{background:#f3f5f9}.code{font: .84rem ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#101827;color:#e6edf8;padding:13px;border-radius:9px}.schema{border:1px solid var(--line);border-radius:10px;margin:9px 0}.schema summary{padding:12px;cursor:pointer;font-weight:650}.schema-body{padding:0 14px 14px}.required{color:#ad2432;font-size:.77rem}.empty{padding:18px;color:var(--muted)}.footer{color:var(--muted);font-size:.85rem;text-align:center;padding:24px}
    @media(max-width:850px){.columns{grid-template-columns:1fr}.side{position:static;max-height:none}.layout{padding:14px}.hero{padding:24px}.panel{padding:16px}}
    @media(prefers-color-scheme:dark){:root{color:#e8edf7;background:#111722;--line:#303b4e;--muted:#a9b6ca}.side,.panel,.operation,.toolbar input,.toolbar select{background:#192231;color:#e8edf7}.business p{color:#bdc8d9}th{background:#222e40}.intro{color:#c5cfde}}
  </style>
</head>
<body>
<main class="layout">
  <header class="hero">
    <div class="eyebrow">Referencia técnica y funcional</div>
    <h1 id="title">Documentación de la API · Fichapp</h1>
    <p id="description"></p>
    <div class="meta"><span class="pill" id="version"></span><span class="pill" id="route-count"></span><span class="pill">Contrato OpenAPI generado desde el backend</span></div>
  </header>
  <div class="columns">
    <nav class="side" aria-label="Índice"><h2>Contenido</h2><a href="#overview">Visión funcional</a><a href="#operations">Endpoints</a><a href="#schemas">Esquemas de datos</a><a href="/openapi.json">OpenAPI JSON</a><a href="/docs">Swagger UI</a><a href="/redoc">ReDoc</a><div id="tag-nav"></div></nav>
    <div class="content">
      <section class="panel" id="overview"><h2>Cómo leer esta documentación</h2><p class="intro">Las descripciones de operaciones, parámetros, permisos declarados en OpenAPI, respuestas y esquemas proceden del contrato publicado por FastAPI. Las notas funcionales resumen el dominio; las reglas exactas de cada operación son las que aparecen en su endpoint y en las validaciones del backend.</p><div class="business" id="business"></div></section>
      <section class="panel" id="operations"><h2>Endpoints</h2><div class="toolbar"><input id="search" type="search" placeholder="Buscar por ruta, resumen, descripción o etiqueta…" aria-label="Buscar endpoints"><select id="tag-filter" aria-label="Filtrar por grupo"><option value="">Todos los grupos</option></select><span class="count" id="operation-count"></span></div><div id="operation-list"></div></section>
      <section class="panel" id="schemas"><h2>Esquemas de datos</h2><p class="muted">Los campos, tipos, valores requeridos y descripciones se leen de los esquemas Pydantic expuestos en OpenAPI.</p><input id="schema-search" class="toolbar" type="search" placeholder="Filtrar esquemas…" aria-label="Buscar esquemas"><div id="schema-list"></div></section>
    </div>
  </div>
  <footer class="footer">Documentación generada localmente desde el contrato OpenAPI de Fichapp. No incluye credenciales ni permite ejecutar operaciones.</footer>
</main>
<script id="openapi-data" type="application/json">__OPENAPI_JSON__</script>
<script>
(() => {
  const spec = JSON.parse(document.getElementById('openapi-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = value => esc(value).replace(/\n/g, '<br>');
  const resolve = schema => {
    if (!schema) return {};
    if (schema.$ref) return spec.components?.schemas?.[schema.$ref.split('/').pop()] || {description:schema.$ref};
    return schema;
  };
  const schemaName = schema => schema?.$ref ? schema.$ref.split('/').pop() : '';
  const schemaType = schema => {
    if (!schema) return '—';
    const ref = schemaName(schema);
    if (ref) return ref;
    if (schema.enum) return `${schema.type || 'string'} (${schema.enum.join(', ')})`;
    if (schema.type === 'array') return `array<${schemaType(schema.items)}>`;
    if (schema.anyOf || schema.oneOf) return (schema.anyOf || schema.oneOf).map(schemaType).join(' | ');
    return [schema.type, schema.format].filter(Boolean).join(' / ') || 'object';
  };
  const schemas = spec.components?.schemas || {};
  const makeSchemaTable = schema => {
    const resolved = resolve(schema);
    if (resolved.properties) {
      const required = new Set(resolved.required || []);
      const rows = Object.entries(resolved.properties).map(([name, property]) => `<tr><td><code>${esc(name)}</code>${required.has(name) ? ' <span class="required">requerido</span>' : ''}</td><td>${esc(schemaType(property))}</td><td>${text(property.description || resolve(property).description || '')}</td></tr>`).join('');
      return `<div class="table-wrap"><table><thead><tr><th>Campo</th><th>Tipo</th><th>Descripción</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Sin campos definidos</td></tr>'}</tbody></table></div>`;
    }
    return `<p class="muted">${esc(schemaType(schema))}${resolved.description ? ` · ${text(resolved.description)}` : ''}</p>`;
  };
  const renderBody = operation => {
    const body = operation.requestBody;
    if (!body) return '';
    const media = body.content || {};
    return `<h4 class="subheading">Cuerpo ${body.required ? '(obligatorio)' : '(opcional)'}</h4>${Object.entries(media).map(([type, info]) => `<p><code>${esc(type)}</code> ${schemaName(info.schema) ? `· esquema <a href="#schema-${encodeURIComponent(schemaName(info.schema))}">${esc(schemaName(info.schema))}</a>` : ''}</p>${info.schema ? makeSchemaTable(info.schema) : ''}${info.example ? `<pre class="code">${esc(JSON.stringify(info.example,null,2))}</pre>` : ''}`).join('')}`;
  };
  const renderParameters = parameters => {
    if (!parameters?.length) return '';
    return `<h4 class="subheading">Parámetros</h4><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Ubicación</th><th>Requerido</th><th>Tipo</th><th>Descripción</th></tr></thead><tbody>${parameters.map(p => `<tr><td><code>${esc(p.name)}</code></td><td>${esc(p.in)}</td><td>${p.required ? 'Sí' : 'No'}</td><td>${esc(schemaType(p.schema))}</td><td>${text(p.description || '')}</td></tr>`).join('')}</tbody></table></div>`;
  };
  const renderResponses = responses => `<h4 class="subheading">Respuestas</h4><div class="table-wrap"><table><thead><tr><th>HTTP</th><th>Descripción</th><th>Contenido</th></tr></thead><tbody>${Object.entries(responses || {}).map(([code, response]) => {const content=Object.entries(response.content || {}).map(([type,media])=>`${esc(type)}${schemaName(media.schema) ? ` · ${esc(schemaName(media.schema))}` : ''}`).join('<br>');return `<tr><td><code>${esc(code)}</code></td><td>${text(response.description || '')}</td><td>${content || '—'}</td></tr>`;}).join('')}</tbody></table></div>`;
  const operationEntries = Object.entries(spec.paths || {}).flatMap(([path, methods]) => Object.entries(methods).filter(([method]) => ['get','post','put','patch','delete','options','head'].includes(method)).map(([method,op])=>({path,method:method.toUpperCase(),op,tags:op.tags?.length?op.tags:['General']})));
  const tags = [...new Set(operationEntries.flatMap(item => item.tags))].sort((a,b)=>a.localeCompare(b,'es'));
  document.title = `${spec.info?.title || 'API'} · Documentación`;
  document.getElementById('title').textContent = spec.info?.title || 'Documentación de la API';
  document.getElementById('description').textContent = spec.info?.description || 'Referencia de endpoints y esquemas.';
  document.getElementById('version').textContent = `Versión ${spec.info?.version || 'sin especificar'}`;
  document.getElementById('route-count').textContent = `${operationEntries.length} operaciones · ${Object.keys(schemas).length} esquemas`;
  document.getElementById('business').innerHTML = (spec['x-fichapp-business-overview'] || []).map(item => `<article><h3>${esc(item.title)}</h3><p>${text(item.text)}</p></article>`).join('');
  const tagSelect = document.getElementById('tag-filter');
  const tagNav = document.getElementById('tag-nav');
  tags.forEach((tag,index) => {tagSelect.insertAdjacentHTML('beforeend',`<option value="${esc(tag)}">${esc(tag)}</option>`);tagNav.insertAdjacentHTML('beforeend',`<a href="#tag-${index}">${esc(tag)}</a>`);});
  const operationList = document.getElementById('operation-list');
  const drawOperations = () => {
    const query = document.getElementById('search').value.trim().toLocaleLowerCase('es');
    const selectedTag = tagSelect.value;
    let visible = 0;
    let html = '';
    tags.forEach((tag,index) => {
      const list = operationEntries.filter(item => item.tags.includes(tag) && (!selectedTag || item.tags.includes(selectedTag)) && `${item.path} ${item.method} ${item.op.summary || ''} ${item.op.description || ''} ${item.tags.join(' ')} ${item.op['x-fichapp-handler-docstring'] || ''}`.toLocaleLowerCase('es').includes(query));
      if (!list.length) return;
      visible += list.length;
      html += `<h3 class="tag-title" id="tag-${index}">${esc(tag)} <span class="muted">(${list.length})</span></h3>`;
      html += list.map(({path,method,op}) => `<details class="operation"><summary><span class="method ${method}">${method}</span><span class="path">${esc(path)}</span><span class="summary-text">${esc(op.summary || '')}</span></summary><div class="op-body">${op.description ? `<p>${text(op.description)}</p>` : ''}${op['x-fichapp-handler-docstring'] ? `<details><summary>Nota del endpoint</summary><p>${text(op['x-fichapp-handler-docstring'])}</p></details>` : ''}${renderParameters(op.parameters)}${renderBody(op)}${renderResponses(op.responses)}${op.security ? `<p class="muted">Autenticación: ${esc(JSON.stringify(op.security))}</p>` : ''}</div></details>`).join('');
    });
    operationList.innerHTML = html || '<p class="empty">No hay operaciones que coincidan con la búsqueda.</p>';
    document.getElementById('operation-count').textContent = `${visible} de ${operationEntries.length} operaciones`;
  };
  document.getElementById('search').addEventListener('input',drawOperations);
  tagSelect.addEventListener('change',drawOperations);
  drawOperations();
  const schemaList = document.getElementById('schema-list');
  const drawSchemas = () => {
    const query = document.getElementById('schema-search').value.trim().toLocaleLowerCase('es');
    const entries = Object.entries(schemas).filter(([name,schema]) => `${name} ${schema.description || ''} ${Object.keys(schema.properties || {}).join(' ')}`.toLocaleLowerCase('es').includes(query));
    schemaList.innerHTML = entries.map(([name,schema]) => `<details class="schema" id="schema-${encodeURIComponent(name)}"><summary>${esc(name)} <span class="muted">${esc(schemaType(schema))}</span></summary><div class="schema-body">${schema.description ? `<p>${text(schema.description)}</p>` : ''}${makeSchemaTable(schema)}</div></details>`).join('') || '<p class="empty">No hay esquemas que coincidan.</p>';
  };
  document.getElementById('schema-search').addEventListener('input',drawSchemas);
  drawSchemas();
})();
</script>
</body>
</html>
'''.replace("__OPENAPI_JSON__", payload)


def main() -> None:
    # Importar aquí permite que la ruta del módulo se configure antes de cargar la app.
    from main import app

    spec = app.openapi()
    build_documentation_metadata(app, spec)
    OUTPUT_HTML.write_text(render_html(spec), encoding="utf-8")
    operations = sum(
        1
        for methods in spec.get("paths", {}).values()
        for method in methods
        if method in {"get", "post", "put", "patch", "delete", "options", "head"}
    )
    schemas = spec.get("components", {}).get("schemas", {})
    print("Documentación de Fichapp generada correctamente.")
    print(f"Página HTML: {OUTPUT_HTML}")
    print(f"Operaciones: {operations} | Esquemas: {len(schemas)}")


if __name__ == "__main__":
    main()
