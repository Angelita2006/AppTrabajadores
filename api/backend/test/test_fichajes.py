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

from core.enums import TipoUsuarioEnum, MetodoFichajeEnum, OrigenFichajeEnum, EstadoFichajeEnum
from routes.fichajes import (
    crear_fichaje,
    obtener_fichajes_trabajador_empresa,
    obtener_fichajes_turno_actual,
    obtener_ultimo_fichaje_trabajador,
    obtener_fichaje,
    validar_fichaje,
    eliminar_fichaje
)

from schemas.fichajes import FichajeCreate

def test_crear_fichaje():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)
    centro_trabajo = SimpleNamespace(id=id_centro, latitud=None, longitud=None)
    tipo_evento = SimpleNamespace(id=id_tipo_evento)

    fichaje_existente = SimpleNamespace(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        empresa,
        None,
        None,
        tipo_evento,
        None
    ]
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        trabajador,
        centro_trabajo,
        fichaje_existente
    ]

    fichaje_data = FichajeCreate(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    response = crear_fichaje(
        request=request,
        obj_in=fichaje_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is fichaje_existente
    assert db.commit.call_count == 1

def test_obtener_fichajes_trabajador_empresa():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    fichaje_existente = SimpleNamespace(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador,
        empresa,
    ]
    db.query.return_value.options.return_value.filter.return_value.all.return_value = fichaje_existente

    response = obtener_fichajes_trabajador_empresa(
        request=request,
        id_trabajador=id_trabajador,
        id_empresa=id_empresa,
        db=db,
        usuario_actual=usuario
    )

    assert response == fichaje_existente

def test_obtener_fichajes_turno_actual():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    fichaje_existente = SimpleNamespace(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador,
        empresa,
    ]
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = [fichaje_existente]
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        fichaje_existente
    ]

    response = obtener_fichajes_turno_actual(
        request=request,
        id_trabajador=id_trabajador,
        db=db,
        usuario_actual=usuario
    )

    assert response == [fichaje_existente]

def test_obtener_ultimo_fichaje_trabajador():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    fichaje_existente1 = SimpleNamespace(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )
    fichaje_existente2 = SimpleNamespace(
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador
    ]
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.first.return_value = fichaje_existente2

    response = obtener_ultimo_fichaje_trabajador(
        request=request,
        id_trabajador=id_trabajador,
        db=db,
        usuario_actual=usuario
    )

    assert response is fichaje_existente2

def test_obtener_fichaje():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    id_fichaje = uuid4()

    fichaje_existente = SimpleNamespace(
        id=id_fichaje,
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.VALIDO
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador,
        empresa,
    ]
    db.query.return_value.options.return_value.filter.return_value.all.return_value = fichaje_existente
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        fichaje_existente
    ]

    response = obtener_fichaje(
        request=request,
        id_fichaje=id_fichaje,
        db=db,
        usuario_actual=usuario
    )

    assert response == fichaje_existente

def test_validar_fichaje():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    id_fichaje = uuid4()

    fichaje_existente = SimpleNamespace(
        id=id_fichaje,
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.PENDIENTE_REVISION
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = fichaje_existente

    with pytest.raises(Exception) as exc_info:
        validar_fichaje(
            request=request,
            id_fichaje=id_fichaje,
            db=db,
            usuario_actual=usuario
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Los fichajes son inmutables. La validación debe realizarse mediante una corrección aprobada."
    db.commit.assert_called_once()

def test_eliminar_fichaje():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    id_trabajador = uuid4()
    id_centro = uuid4()
    id_tipo_evento = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=id_empresa)
    empresa = SimpleNamespace(id=id_empresa)

    id_fichaje = uuid4()

    fichaje_existente = SimpleNamespace(
        id=id_fichaje,
        empresa_id=id_empresa,
        trabajador_id=id_trabajador,
        centro_trabajo_id=id_centro,
        tipo_evento_id=id_tipo_evento,
        metodo_fichaje= MetodoFichajeEnum.APP_MOVIL,
        origen=OrigenFichajeEnum.TRABAJADOR,
        estado=EstadoFichajeEnum.PENDIENTE_REVISION
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = fichaje_existente

    with pytest.raises(Exception) as exc_info:
        eliminar_fichaje(
            request=request,
            id_fichaje=id_fichaje,
            db=db,
            usuario_actual=usuario
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Los fichajes son inmutables. Solicita una corrección o anulación mediante el flujo de incidencias."
    db.commit.assert_called_once()