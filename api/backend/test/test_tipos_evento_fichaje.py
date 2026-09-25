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
from routes.tipos_evento_fichaje import(
    obtener_tipos_de_evento_empresa,
    obtener_tipo_evento_por_codigo,
    obtener_tipo_evento_por_id,
    crear_tipo_evento_fichaje,
    actualizar_tipo_evento_fichaje,
    dar_de_baja_tipo_evento_fichaje
)

from schemas.tipos_evento_fichaje import(
    TipoEventoFichajeCreate,
    TipoEventoFichajeUpdate
)

def test_obtener_tipos_de_evento_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    tipos_evento = [
        SimpleNamespace(
            codigo="4239uh9873",
            descripcion="Descripcion del tipo de evento",
            computa_como_trabajo=False,
            empresa_id = empresa_id
        ),
        SimpleNamespace(
            codigo="9237hr34cv",
            descripcion="Descripcion del tipo de evento",
            computa_como_trabajo=False,
            empresa_id = empresa_id
        ),
        SimpleNamespace(
            codigo="23895yrhrw87",
            descripcion="Descripcion del tipo de evento",
            computa_como_trabajo=False,
            empresa_id = empresa_id
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = tipos_evento

    response = obtener_tipos_de_evento_empresa(
        request=request,
        empresa_id=empresa_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == tipos_evento

def test_obtener_tipo_evento_por_codigo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    tipo_evento = SimpleNamespace(
        id=uuid4(),
        codigo="4239uh9873",
        descripcion="Descripcion del tipo de evento",
        computa_como_trabajo=False,
        empresa_id = empresa_id
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = tipo_evento

    response = obtener_tipo_evento_por_codigo(
        request=request,
        codigo_clave="4239uh9873",
        db=db,
        usuario_actual=usuario
    )

    assert response == tipo_evento

def test_obtener_tipo_evento_por_id():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    id_tipo_evento = uuid4()

    tipo_evento = SimpleNamespace(
        id=id_tipo_evento,
        codigo="4239uh9873",
        descripcion="Descripcion del tipo de evento",
        computa_como_trabajo=False,
        empresa_id = empresa_id
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = tipo_evento

    response = obtener_tipo_evento_por_id(
        request=request,
        id_tipo_evento=id_tipo_evento,
        db=db,
        usuario_actual=usuario
    )

    assert response == tipo_evento

def test_crear_tipo_evento_fichaje():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    tipo_evento = TipoEventoFichajeCreate(
        codigo="o89bhutyr",
        descripcion="Descripcion del tipo de evento",
        computa_como_trabajo=False,
        empresa_id = empresa_id
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    response = crear_tipo_evento_fichaje(
        request=request,
        obj_in=tipo_evento,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_actualizar_tipo_evento_fichaje():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    id_tipo_evento=uuid4()

    tipo_evento_existente = SimpleNamespace(
        id=id_tipo_evento,
        codigo="o89bhutyr",
        descripcion="Descripcion del tipo de evento",
        computa_como_trabajo=False,
        activo=True
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = tipo_evento_existente

    tipo_evento_data = TipoEventoFichajeUpdate(
        descripcion="Descripcion del tipo de evento 2",
        computa_como_trabajo=True,
        activo=True
    )

    response = actualizar_tipo_evento_fichaje(
        request=request,
        id_tipo_evento=id_tipo_evento,
        obj_in=tipo_evento_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == tipo_evento_existente
    db.commit.assert_called_once()

def test_dar_de_baja_tipo_evento_fichaje():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    id_tipo_evento=uuid4()

    tipo_evento = SimpleNamespace(
        id=id_tipo_evento,
        empresa_id=empresa_id,
        codigo="o89bhutyr",
        descripcion="Descripcion del tipo de evento",
        computa_como_trabajo=False,
        activo=True
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = tipo_evento

    response = dar_de_baja_tipo_evento_fichaje(
        request=request,
        id_tipo_evento=id_tipo_evento,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Tipo de evento ({id_tipo_evento}) desactivado correctamente y enviado a la papelera."
    }
    assert tipo_evento.activo is False
    db.commit.assert_called_once()

