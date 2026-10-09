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
from routes.usuarios import(
    registrar_usuario,
    obtener_usuario_por_id,
    obtener_usuario_por_id_trabajador,
    cambiar_estado_usuario,
    solicitar_cambio_email,
    confirmar_cambio_email,
    solicitar_cambio_password,
    confirmar_cambio_password,
    obtener_mi_usuario
)

from schemas.usuarios import(
    UsuarioRegisterCreate
)

def test_registrar_usuario():
    request = MagicMock(spec=Request)
    usuario = UsuarioRegisterCreate(
        nombre="Usuario Prueba",
        email="admin@example.com",
        tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA,
        dni_nif_nie="12345678A",
        empresa_cif="2oi34gafa",
        password="pasword"
    )

    empresa = SimpleNamespace(id=uuid4())
    trabajador = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa.id,
        dni_nif_nie=usuario.dni_nif_nie,
        nombre="Usuario",
        apellidos="Prueba",
        rol_id=None,
    )
    usuario_creado = SimpleNamespace(id=uuid4(), email=usuario.email)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        None,
        empresa,
        trabajador,
        None,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = usuario_creado

    response = registrar_usuario(
        request=request,
        db=db,
        obj_in=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_obtener_usuario_por_id():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(
        id=uuid4(),
        nombre="Usuario Prueba",
        email="admin@example.com",
        tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA,
        dni_nif_nie="12345678A",
        empresa_cif="2oi34gafa",
        password="pasword",
        empresa_id=empresa.id
    )
    trabajador = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa.id,
        dni_nif_nie=usuario.dni_nif_nie,
        nombre="Usuario",
        apellidos="Prueba",
        rol_id=None,
    )
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = usuario

    response = obtener_usuario_por_id(
        request=request,
        id_usuario=usuario.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == usuario

def test_obtener_usuario_por_id_trabajador():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(
        id=uuid4(),
        nombre="Usuario Prueba",
        email="admin@example.com",
        tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA,
        dni_nif_nie="12345678A",
        empresa_cif="2oi34gafa",
        password="pasword",
        empresa_id=empresa.id,
        activo=True
    )
    trabajador = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa.id,
        dni_nif_nie=usuario.dni_nif_nie,
        nombre="Usuario",
        apellidos="Prueba",
        rol_id=None,
    )
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = usuario

    response = obtener_usuario_por_id_trabajador(
        request=request,
        id_trabajador=trabajador.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == usuario

def test_cambiar_estado_usuario():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(
        id=uuid4(),
        nombre="Usuario Prueba",
        email="admin@example.com",
        tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA,
        dni_nif_nie="12345678A",
        empresa_cif="2oi34gafa",
        password="pasword",
        empresa_id=empresa.id,
        activo=True
    )
    trabajador = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa.id,
        dni_nif_nie=usuario.dni_nif_nie,
        nombre="Usuario",
        apellidos="Prueba",
        rol_id=None,
    )
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = usuario

    response = cambiar_estado_usuario(
        request=request,
        id_usuario=usuario.id,
        activo=False,
        db=db,
        usuario_actual=usuario
    )

    assert response == usuario

def test_obtener_mi_usuario():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(
        id=uuid4(),
        nombre="Usuario Prueba",
        email="admin@example.com",
        tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA,
        dni_nif_nie="12345678A",
        empresa_cif="2oi34gafa",
        password="pasword",
        empresa_id=empresa.id,
        activo=True
    )
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = usuario

    response = obtener_mi_usuario(
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response == usuario