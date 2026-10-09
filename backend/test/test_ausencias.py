import os
import sys
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

from routes.ausencias import (
    solicitar_ausencia,
    resolver_solicitud_ausencia,
    obtener_ausencias_por_empresa,
    obtener_ausencias_por_trabajador,
)

from core.enums import TipoAusenciaEnum, EstadoAusenciaEnum
from schemas.ausencias import AusenciaCreate

def test_solicitar_ausencia():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()

    ausencia_solicitada = SimpleNamespace(
        usuario_id=usuario.id,
        trabajador_id=trabajador_id,
        empresa_id=usuario.empresa_id,
        fecha_inicio=date.today(),
        fecha_fin=date.today(),
        tipo_ausencia=TipoAusenciaEnum.VACACIONES,
        motivo="Solicitud de vacaciones",
        estado="pendiente"
    )

    empresa = SimpleNamespace(id=usuario.empresa_id)
    usuario_db = SimpleNamespace(id=usuario.id)
    trabajador = SimpleNamespace(id=trabajador_id, empresa_id=usuario.empresa_id)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        empresa,
        usuario_db,
        trabajador,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = ausencia_solicitada

    ausencia_data = AusenciaCreate(
        empresa_id=usuario.empresa_id,
        fecha_inicio=date.today(),
        fecha_fin=date.today(),
        tipo_ausencia=TipoAusenciaEnum.VACACIONES,
        motivo="Solicitud de vacaciones",
        usuario_id=usuario.id,
        trabajador_id=trabajador_id
    )

    response = solicitar_ausencia(
        request=request,
        db=db,
        obj_in=ausencia_data,
        usuario_actual=usuario
    )

    assert response is ausencia_solicitada
    assert db.add.call_count == 2
    db.commit.assert_called_once()

def test_resolver_solicitud_ausencia():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    ausencia_id = uuid4()
    trabajador_id = uuid4()

    ausencia_resuelta = SimpleNamespace(
        id=ausencia_id,
        usuario_id=usuario.id,
        empresa_id=usuario.empresa_id,
        estado=EstadoAusenciaEnum.APROBADA,
        trabajador_id=trabajador_id,
        fecha_inicio=date.today(),
        fecha_fin=date.today(),
    )

    empresa = SimpleNamespace(id=usuario.empresa_id)
    usuario_db = SimpleNamespace(id=usuario.id)
    ausencia = SimpleNamespace(id=ausencia_id, empresa_id=usuario.empresa_id, trabajador_id=trabajador_id, estado=EstadoAusenciaEnum.PENDIENTE)
    trabajador = SimpleNamespace(id=trabajador_id, empresa_id=usuario.empresa_id)
    resolutor_usuario_id = uuid4()
    resolutor = SimpleNamespace(id=resolutor_usuario_id)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        ausencia,
        trabajador,
        resolutor,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = ausencia_resuelta

    response = resolver_solicitud_ausencia(
        request=request,
        db=db,
        id_ausencia=ausencia_id,
        usuario_actual=usuario,
        nuevo_estado=EstadoAusenciaEnum.APROBADA,
        resolutor_usuario_id=resolutor_usuario_id,
        observaciones="Solicitud aprobada por el administrador"
    )

    assert response is ausencia_resuelta
    db.commit.assert_called_once()

def test_obtener_ausencias_por_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = []

    response = obtener_ausencias_por_empresa(
        request=request,
        db=db,
        id_empresa=empresa_id,
        usuario_actual=usuario_actual
    )

    assert response == []
    db.query.assert_called_once()

def test_obtener_ausencias_por_trabajador():
    request = MagicMock(spec=Request)
    trabajador_id = uuid4()
    empresa_id = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    trabajador = SimpleNamespace(id=trabajador_id, empresa_id=empresa_id)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.all.return_value = []

    response = obtener_ausencias_por_trabajador(
        request=request,
        db=db,
        id_trabajador=trabajador_id,
        usuario_actual=usuario_actual
    )

    assert response == []
    assert db.query.call_count == 2