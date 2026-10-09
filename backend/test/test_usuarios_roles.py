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
from routes.usuarios_roles import(
    obtener_roles_por_usuario,
    asignar_rol_usuario,
    actualizar_rol_usuario,
    revocar_rol_usuario
)

from schemas.usuarios_roles import(
    UsuarioRolCreate
)

def test_obtener_roles_por_usuario():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    roles = [
        SimpleNamespace(
            usuario_id= usuario.id,
            rol_id= uuid4(),
        ),
        SimpleNamespace(
            usuario_id= usuario.id,
            rol_id= uuid4(),
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = roles

    response = obtener_roles_por_usuario(
        request=request,
        id_usuario=usuario.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == roles

def test_asignar_rol_usuario():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    rol = UsuarioRolCreate(
        usuario_id=usuario.id,
        rol_id=uuid4(),
        empresa_id=empresa_id
    )

    db = MagicMock()
    rol_existente = SimpleNamespace(id=rol.rol_id)
    empresa = SimpleNamespace(id=empresa_id)
    db.query.return_value.filter.return_value.first.side_effect = [
        usuario,
        rol_existente,
        empresa,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = None

    response = asignar_rol_usuario(
        request=request,
        obj_in=rol,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_actualizar_rol_usuario():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    asignacion = SimpleNamespace(
        id=uuid4(),
        usuario_id=usuario.id,
        rol_id=uuid4(),
        empresa_id=empresa_id
    )

    db = MagicMock()
    rol_existente = SimpleNamespace(id=asignacion.rol_id)
    empresa = SimpleNamespace(id=empresa_id)
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        asignacion,
        None,
    ]
    db.query.return_value.filter.return_value.first.side_effect = [
        usuario,
        rol_existente,
        empresa,
    ]

    rol_usuario_data = UsuarioRolCreate(
        usuario_id=usuario.id,
        rol_id=uuid4(),
        empresa_id=empresa_id
    )

    response = actualizar_rol_usuario(
        request=request,
        id_asignacion= asignacion.id,
        db=db,
        obj_in=rol_usuario_data,
        usuario_actual=usuario
    )

    assert response == asignacion

def test_revocar_rol_usuario():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    asignacion = SimpleNamespace(
        id=uuid4(),
        usuario_id=usuario.id,
        rol_id=uuid4(),
        empresa_id=empresa_id
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = asignacion

    response = revocar_rol_usuario(
        request=request,
        id_asignacion=asignacion.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
       "detail": f"Rol revocado correctamente. Asignación con ID {asignacion.id} eliminada."
    }
    db.commit.assert_called_once()