import os
import sys
import pytest
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

from core.enums import TipoUsuarioEnum
from routes.politicas_retencion import(
    obtener_politica_global_defecto,
    obtener_politica_aplicable_empresa,
    crear_politica_retencion,
    actualizar_anios_retencion
)

from schemas.politicas_retencion import(
    PoliticaRetencionCreate
)

def test_obtener_politica_global_defecto():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    politica_global = SimpleNamespace(id=uuid4(), empresa_id=None, anios_retencion=5)

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = politica_global

    response = obtener_politica_global_defecto(
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response is politica_global
    db.commit.assert_called_once()

def test_obtener_politica_aplicable_empresa():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    politica_empresa = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, anios_retencion=5)

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = politica_empresa

    response = obtener_politica_aplicable_empresa(
        request=request,
        id_empresa=empresa.id,
        db=db,
        usuario_actual=usuario
    )

    assert response is politica_empresa
    db.commit.assert_called_once()

def test_crear_politica_retencion():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    politica_retencion = PoliticaRetencionCreate(empresa_id=empresa.id, anios_retencion=5)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [empresa, None]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = politica_retencion

    response = crear_politica_retencion(
        request=request,
        obj_in= politica_retencion,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_actualizar_anios_retencion():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    politica_id = uuid4()
    politica_retencion_existente = SimpleNamespace(id=politica_id, empresa_id=empresa.id, anios_retencion=5)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = politica_retencion_existente
    db.query.return_value.options.return_value.filter.return_value.first.return_value = politica_retencion_existente

    response = actualizar_anios_retencion(
        request=request,
        db=db,
        nuevos_anios=7,
        id_politica=politica_id,
        usuario_actual=usuario
    )

    assert response == politica_retencion_existente