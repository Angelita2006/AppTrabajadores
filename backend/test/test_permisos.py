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
from routes.permisos import (
    crear_permiso_seguridad,
    obtener_todos_los_permisos
)

from schemas.permisos import (
    PermisoCreate
)

def test_crear_permiso_seguridad():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    permiso_data = PermisoCreate(
        codigo="9jwo33jos",
        descripcion="Permiso de ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    response = crear_permiso_seguridad(
        request=request,
        obj_in=permiso_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_obtener_todos_los_permisos():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    permisos = [
        PermisoCreate(codigo="9jwo33jos",descripcion="Permiso de ejemplo"),
        PermisoCreate(codigo="908h3udfuh",descripcion="Permiso de ejemplo")
    ]

    db = MagicMock()
    db.query.return_value.all.return_value = permisos

    response = obtener_todos_los_permisos(
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response == permisos