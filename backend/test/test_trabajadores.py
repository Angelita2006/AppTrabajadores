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
from routes.trabajadores import (
    obtener_trabajadores_por_empresa,
    obtener_trabajador,
    obtener_empresa_trabajador,
    registrar_trabajador,
    asignar_turnos_trabajador,
    actualizar_trabajador,
    baja_total_trabajador,
    eliminar_trabajador
)

from schemas.trabajadores import(
    TrabajadorCreate,
    TrabajadorUpdate,
    AsignarTurnosRequest
)

def test_obtener_trabajadores_por_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajadores = [
        SimpleNamespace(
            empresa_id=empresa_id,
            dni_nif_nie= "12345678A",
            nombre="Trabajador",
            apellidos="Ejemplo"
        ),
        SimpleNamespace(
            empresa_id=empresa_id,
            dni_nif_nie= "12345678A",
            nombre="Trabajador",
            apellidos="Ejemplo"
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = trabajadores

    response = obtener_trabajadores_por_empresa(
        request=request,
        db=db,
        id_empresa=empresa_id,
        usuario_actual=usuario
    )

    assert response == trabajadores

def test_obtener_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    id_trabajador = uuid4()
    trabajador = SimpleNamespace(
        id=id_trabajador,
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = trabajador

    response = obtener_trabajador(
        request=request,
        id_trabajador=id_trabajador,
        db=db,
        usuario_actual=usuario
    )

    assert response == trabajador

def test_obtener_empresa_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    id_trabajador = uuid4()
    empresa = SimpleNamespace(
        id=empresa_id,
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )

    trabajador = SimpleNamespace(
        id=id_trabajador,
        empresa_id=empresa_id,
        dni_nif_nie="12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo",
        empresa=empresa
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = trabajador

    response = obtener_empresa_trabajador(
        request=request,
        id_trabajador=id_trabajador,
        db=db,
        usuario_actual=usuario
    )

    assert response == empresa

def test_registrar_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajador = TrabajadorCreate(
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    db = MagicMock()
    trabajador_creado = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        dni_nif_nie=trabajador.dni_nif_nie,
        nombre=trabajador.nombre,
        apellidos=trabajador.apellidos,
    )
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.options.return_value.filter.return_value.first.return_value = trabajador_creado

    response = registrar_trabajador(
        request=request,
        obj_in=trabajador,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_asignar_turnos_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajador = SimpleNamespace(
        id = uuid4(),
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    turno_1 = SimpleNamespace(id = uuid4())
    turno_2 = SimpleNamespace(id = uuid4())

    nuevas_asignaciones = AsignarTurnosRequest(
        turnos= [
            turno_1.id,
            turno_2.id
        ],
        fecha_inicio=date.today(),
        fecha_fin=date.today()
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador,
        turno_1,
        turno_2,
    ]

    response = asignar_turnos_trabajador(
        request=request,
        id_trabajador=trabajador.id,
        obj_in=nuevas_asignaciones,
        db=db,
        usuario_actual=usuario
    )

    assert response["status"] == "success"
    assert response["detail"] == f"Se han asignado exitosamente {len(nuevas_asignaciones.turnos)} turnos al trabajador."
    assert response["trabajador_id"] == trabajador.id
    assert response["turnos_asignados"] == nuevas_asignaciones.turnos
    db.commit.assert_called_once()

def test_actualizar_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajador_existente = SimpleNamespace(
        id = uuid4(),
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador_existente
    db.query.return_value.options.return_value.filter.return_value.first.return_value = trabajador_existente

    trabajador_data = TrabajadorUpdate(
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador2",
        apellidos="Ejemplo2"
    )

    response = actualizar_trabajador(
        request=request,
        id_trabajador=trabajador_existente.id,
        obj_in=trabajador_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == trabajador_existente

def test_baja_total_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajador = SimpleNamespace(
        id = uuid4(),
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador

    response = baja_total_trabajador(
        request=request,
        id_trabajador=trabajador.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Baja total procesada correctamente para el trabajador {trabajador.id}."
    }
    db.commit.assert_called_once()

def test_eliminar_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    trabajador = SimpleNamespace(
        id = uuid4(),
        empresa_id=empresa_id,
        dni_nif_nie= "12345678A",
        nombre="Trabajador",
        apellidos="Ejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador

    response = eliminar_trabajador(
        request=request,
        id_trabajador=trabajador.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Trabajador con ID {trabajador.id} eliminado correctamente junto con su planificación en cascada."
    }
    db.commit.assert_called_once()