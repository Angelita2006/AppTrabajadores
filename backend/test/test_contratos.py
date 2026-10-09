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

from routes.contratos import (
    crear_contrato,
    actualizar_contrato,
    rescindir_contrato,
    eliminar_todos_los_contratos_trabajador,
    obtener_contratos_por_trabajador,
    obtener_contratos_por_empresa,
    obtener_contrato_activo_trabajador_empresa
)

from schemas.contratos import (
    ContratoCreate,
    ContratoUpdate,
)
from core.enums import TipoContratoEnum, TipoJornadaEnum

def test_crear_contrato():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    contrato_data = ContratoCreate(
        trabajador_id=uuid4(),
        empresa_id=empresa_id,
        centro_trabajo_id=uuid4(),
        tipo_contrato=TipoContratoEnum.TEMPORAL,
        tipo_jornada=TipoJornadaEnum.COMPLETA,
        horas_semana=40,
        fecha_inicio="2023-01-01",
        fecha_fin="2023-12-31",
        puesto_trabajo="Desarrollador",
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = crear_contrato(
        request=request,
        db=db,
        obj_in=contrato_data,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_actualizar_contrato():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    contrato_data = ContratoUpdate(
        trabajador_id=uuid4(),
        empresa_id=empresa_id,
        centro_trabajo_id=uuid4(),
        tipo_contrato=TipoContratoEnum.TEMPORAL,
        tipo_jornada=TipoJornadaEnum.COMPLETA,
        horas_semana=40,
        fecha_inicio="2023-01-01",
        fecha_fin="2023-12-31",
        puesto_trabajo="Desarrollador",
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = actualizar_contrato(
        request=request,
        db=db,
        obj_in=contrato_data,
        id_contrato=usuario.id,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_rescindir_contrato():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    contrato_id = uuid4()
    contrato = SimpleNamespace(
        id=contrato_id,
        empresa_id=empresa_id,
        fecha_inicio=date(2023, 1, 1),
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = contrato

    response = rescindir_contrato(
        request=request,
        db=db,
        id_contrato=contrato_id,
        usuario_actual=usuario,
        fecha_fin=date.today()
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_eliminar_todos_los_contratos_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    trabajador_id = uuid4()

    contrato_activo = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        trabajador_id=trabajador_id,
        fecha_inicio=date(2023, 2, 1),
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.first.return_value = contrato_activo

    response = eliminar_todos_los_contratos_trabajador(
        request=request,
        db=db,
        empresa_id=empresa_id,
        trabajador_id=trabajador_id,
        usuario_actual=usuario
    )

    assert response is None
    db.query.return_value.filter.return_value.delete.assert_called_once_with(
        synchronize_session=False
    )
    db.commit.assert_called_once()

def test_obtener_contratos_por_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_trabajador = uuid4()

    contratos = [
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, trabajador_id=id_trabajador, fecha_inicio=date(2023, 1, 1)),
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id,
        trabajador_id=id_trabajador,
        fecha_inicio=date(2023, 2, 1)),
    ]

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=empresa_id)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.all.return_value = contratos

    response = obtener_contratos_por_trabajador(
        request=request,
        db=db,
        id_trabajador=id_trabajador,
        usuario_actual=usuario
    )

    assert response == contratos

def test_obtener_contratos_por_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    contratos = [
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, fecha_inicio=date(2023, 1, 1)),
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, fecha_inicio=date(2023, 2, 1)),
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = contratos

    response = obtener_contratos_por_empresa(
        request=request,
        db=db,
        id_empresa=empresa_id,
        usuario_actual=usuario
    )

    assert response == contratos

def test_obtener_contrato_activo_trabajador_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    trabajador_id = uuid4()

    contrato_activo = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa_id,
        trabajador_id=trabajador_id,
        fecha_inicio=date(2023, 2, 1),
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.first.return_value = contrato_activo

    response = obtener_contrato_activo_trabajador_empresa(
        request=request,
        db=db,
        id_trabajador=trabajador_id,
        id_empresa=empresa_id,
        usuario_actual=usuario
    )

    assert response == contrato_activo