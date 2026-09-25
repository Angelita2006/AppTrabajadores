import os
import sys
import pytest
from pathlib import Path

from datetime import date, time
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
from routes.turnos import (
    obtener_turnos_empresa,
    obtener_turno_laboral,
    crear_turno_laboral,
    editar_turno,
    dar_de_baja_turno
)

from schemas.turnos import (
    TurnoCreate,
    TurnoUpdate
)

def test_obtener_turnos_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    turnos = [
        SimpleNamespace(
            empresa_id=empresa_id,
            nombre="Turno Ejemplo 1",
            hora_inicio= time(8), 
            hora_fin=time(14),
            duracion_pausa_minutos=20,
            dias_semana=[2,4]
        ),
        SimpleNamespace(
            empresa_id=empresa_id,
            nombre="Turno Ejemplo 2",
            hora_inicio= time(16), 
            hora_fin=time(22),
            duracion_pausa_minutos=20,
            dias_semana=[1,3,5]
        )
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=empresa_id)
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = turnos

    response = obtener_turnos_empresa(
        request=request,
        id_empresa=empresa_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == turnos

def test_obtener_turno_laboral():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    turno = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Turno Ejemplo",
        hora_inicio= time(16), 
        hora_fin=time(22),
        duracion_pausa_minutos=20,
        dias_semana=[1,3,5]
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = turno

    response = obtener_turno_laboral(
        request=request,
        id_turno=turno.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == turno

def test_crear_turno_laboral():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    turno = TurnoCreate(
        empresa_id=empresa_id,
        nombre="Turno Ejemplo",
        hora_inicio= time(16), 
        hora_fin=time(22),
        duracion_pausa_minutos=20,
        dias_semana=[1,3,5]
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = crear_turno_laboral(
        request=request,
        obj_in=turno,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_editar_turno():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    turno = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Turno Ejemplo",
        hora_inicio= time(16), 
        hora_fin=time(22),
        duracion_pausa_minutos=20,
        dias_semana=[1,3,5]
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = turno

    turno_data = TurnoUpdate(
        empresa_id=empresa_id,
        nombre="Turno Ejemplo",
        hora_inicio= time(16), 
        hora_fin=time(20),
        duracion_pausa_minutos=20,
        dias_semana=[1,3,5, 7]
    )

    response = editar_turno(
        request=request,
        id_turno=turno.id,
        obj_in=turno_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == turno

def test_dar_de_baja_turno():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)

    turno = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        nombre="Turno Ejemplo",
        hora_inicio= time(16), 
        hora_fin=time(22),
        duracion_pausa_minutos=20,
        dias_semana=[1,3,5]
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = turno

    response = dar_de_baja_turno(
        request=request,
        id_turno=turno.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Turno con ID {turno.id} desactivado correctamente y enviado a la papelera."
    }
    assert turno.activo is False
    db.commit.assert_called_once()