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
from routes.roles import (
    obtener_roles,
    obtener_rol_por_id,
    crear_rol_seguridad
)

from schemas.roles import(
    RolCreate
)

def test_obtener_roles():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    roles = [
        SimpleNamespace(
            nombre="Rol Ejemplo",
            descripcion="Esto es un rol de ejemplo"
        ),
        SimpleNamespace(
            nombre="Rol Ejemplo 2",
            descripcion="Esto es otro rol de ejemplo"
        )
    ]

    db = MagicMock()
    db.query.return_value.all.return_value = roles

    response = obtener_roles(
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response == roles

def test_obtener_rol_por_id():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    id_rol = uuid4()
    rol = SimpleNamespace(
        id=id_rol,
        nombre="Rol Ejemplo",
        descripcion="Esto es un rol de ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = rol

    response = obtener_rol_por_id(
        request=request,
        id_rol=id_rol,
        db=db,
        usuario_actual=usuario
    )

    assert response == rol

def test_crear_rol_seguridad():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    rol = RolCreate(
        nombre="Nuevo rol",
        descripcion="Esto es un rol de ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    response = crear_rol_seguridad(
        request=request,
        obj_in=rol,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1