import os
import sys
import asyncio
from pathlib import Path

from datetime import date
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from starlette.requests import Request

_backend_path = str(Path(__file__).resolve().parents[1])
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main

from routes.centros_trabajo import (
    crear_centro_trabajo,
    cambiar_estado_centro,
    editar_centro,
    dar_de_baja_centro_trabajo,
    obtener_centros_empresa,
    obtener_centro_trabajo,
)

from schemas.centros_trabajo import (
    CentroTrabajoCreate,
    CentroTrabajoUpdate,
)

def test_crear_centro_trabajo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    centro_trabajo = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        activo=True,
        codigo_ccc=None,
        direccion=None,
        latitud=None,
        longitud=None,
        model_config=SimpleNamespace(extra="forbid")
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = centro_trabajo
    db.query.return_value.options.return_value.filter.return_value.first.return_value = centro_trabajo

    centro_trabajo_data = CentroTrabajoCreate(
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        model_config=SimpleNamespace(extra="forbid")
    )

    response = asyncio.run(crear_centro_trabajo(
        request=request,
        db=db,
        obj_in=centro_trabajo_data,
        usuario_actual=usuario
    ))

    assert response is not None
    assert db.add.call_count == 2
    
def test_cambiar_estado_centro():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    centro_trabajo = SimpleNamespace(
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        model_config=SimpleNamespace(extra="forbid")
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = cambiar_estado_centro(
        request=request,
        db=db,
        id_centro=uuid4(),
        activo=True,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_editar_centro():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_centro = uuid4()
    centro_trabajo = SimpleNamespace(
        id=id_centro,
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        activo=True,
        codigo_ccc=None,
        direccion=None,
        latitud=None,
        longitud=None,
        model_config=SimpleNamespace(extra="forbid")
    )
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = centro_trabajo
    db.query.return_value.options.return_value.filter.return_value.first.return_value = centro_trabajo

    centro_trabajo_data = CentroTrabajoUpdate(
        nombre="Centro de Prueba Actualizado",
        zona_horaria="America/Los_Angeles",
        model_config=SimpleNamespace(extra="forbid")
    )

    response = asyncio.run(editar_centro(
        request=request,
        db=db,
        id_centro=id_centro,
        nuevos_datos=centro_trabajo_data,
        usuario_actual=usuario
    ))

    assert response is not None
    assert db.commit.call_count == 1

def test_dar_de_baja_centro_trabajo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    centro_trabajo = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        activo=True,
        model_config=SimpleNamespace(extra="forbid")
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = centro_trabajo
    db.commit.return_value = None

    response = dar_de_baja_centro_trabajo(
        request=request,
        db=db,
        id_centro=centro_trabajo.id,
        usuario_actual=usuario
    )

    assert response["detail"] == f"Centro de trabajo ({centro_trabajo.id}) desactivado correctamente y enviado a la papelera."
    assert centro_trabajo.activo is False
    db.commit.assert_called_once()

def test_obtener_centros_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = []

    response = obtener_centros_empresa(
        request=request,
        db=db,
        id_empresa=empresa_id,
        usuario_actual=usuario_actual
    )

    assert response == []
    db.query.assert_called_once()

def test_obtener_centro_trabajo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    centro_trabajo = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Centro de Prueba",
        zona_horaria="America/New_York",
        activo=True,
        model_config=SimpleNamespace(extra="forbid")
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = centro_trabajo

    response = obtener_centro_trabajo(
        request=request,
        db=db,
        id_centro=centro_trabajo.id,
        usuario_actual=usuario_actual
    )

    assert response == centro_trabajo
    db.query.assert_called_once()