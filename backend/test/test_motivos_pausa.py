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
from routes.motivos_pausa import (
    obtener_motivos_disponibles_empresa,
    obtener_motivo_pausa,
    crear_motivo_pausa
)

from schemas.motivos_pausa import(
    MotivoPausaCreate
)

def test_obtener_motivos_disponibles_empresa():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    motivos = [
        SimpleNamespace(nombre="Motivo 1", computa_como_trabajo=False, empresa_id=empresa.id),
        SimpleNamespace(nombre="Motivo 2", computa_como_trabajo=False, empresa_id=empresa.id)
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = motivos

    response = obtener_motivos_disponibles_empresa(
        request=request,
        id_empresa=empresa.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == motivos

def test_obtener_motivo_pausa():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    motivo_id = uuid4()

    motivo = SimpleNamespace(id = motivo_id, nombre="Motivo 1", computa_como_trabajo=False, empresa_id=empresa.id)

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = motivo

    response = obtener_motivo_pausa(
        request=request,
        db=db,
        id_motivo=motivo_id,
        usuario_actual=usuario
    )

    assert response == motivo

def test_crear_motivo_pausa():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    motivo_data = SimpleNamespace(
        nombre="Motivo 1",
        computa_como_trabajo=False,
        empresa_id=empresa.id,
        duracion_max_minutos=None,
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = motivo_data

    response = crear_motivo_pausa(
        request=request,
        obj_in=motivo_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1