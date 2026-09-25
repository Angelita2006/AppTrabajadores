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

from core.enums import TipoCorreccionEnum, EstadoCorreccionEnum
from routes.correcciones_fichaje import (
    solicitar_correccion,
    resolver_incidencia,
    eliminar_solicitud_correccion,
    obtener_correcciones_por_trabajador,
    obtener_correcciones_por_empresa
)

from schemas.correcciones_fichaje import (
    CorreccionFichajeCreate
)

def test_solicitar_correccion():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    correccion_data = CorreccionFichajeCreate(
        trabajador_id=uuid4(),
        empresa_id=empresa_id,
        tipo_correccion=TipoCorreccionEnum.ALTA_MANUAL,
        tipo_evento_id=uuid4(),
        motivo="Motivo de la corrección",
        firma_solicitante="ZmlybWE="
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = solicitar_correccion(
        request=request,
        db=db,
        obj_in=correccion_data,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_resolver_incidencia():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    correccion_id = uuid4()
    incidencia = SimpleNamespace(
        id=correccion_id,
        empresa_id=empresa_id,
        estado=EstadoCorreccionEnum.PENDIENTE,
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = incidencia

    response = resolver_incidencia(
        request=request,
        db=db,
        id_correccion=correccion_id,
        usuario_actual=usuario,
        firma_resolutor="ZmlybWFfcmVzb2x1dG9y",
        nuevo_estado=EstadoCorreccionEnum.RECHAZADA,
        resolutor_usuario_id=uuid4()
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_eliminar_solicitud_correccion():
    request= MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    correccion_id = uuid4()

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = eliminar_solicitud_correccion(
        request=request,
        id_correccion=correccion_id,
        db=db,
        usuario_actual=usuario
    )

    assert response is None
    db.delete.assert_called_once_with(usuario)
    db.commit.assert_called_once()

def test_obtener_correcciones_por_trabajador():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_trabajador = uuid4()

    correcciones = [
        SimpleNamespace(
            empresa_id = empresa_id,
            trabajador_id = id_trabajador,
            tipo_correccion=TipoCorreccionEnum.ALTA_MANUAL,
            tipo_evento_id=uuid4(),
            motivo="Motivo de la corrección"
        ),
        SimpleNamespace(
            empresa_id = empresa_id,
            trabajador_id = id_trabajador,
            tipo_correccion=TipoCorreccionEnum.ALTA_MANUAL,
            tipo_evento_id=uuid4(),
            motivo="Motivo de la corrección"
        )
    ]
    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=empresa_id)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.all.return_value = correcciones

    response = obtener_correcciones_por_trabajador(
        request=request,
        id_trabajador=id_trabajador,
        db = db,
        usuario_actual=usuario
    )

    assert response == correcciones

def test_obtener_correcciones_por_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_trabajador = uuid4()

    correcciones = [
        SimpleNamespace(
            empresa_id = empresa_id,
            trabajador_id = id_trabajador,
            tipo_correccion=TipoCorreccionEnum.ALTA_MANUAL,
            tipo_evento_id=uuid4(),
            motivo="Motivo de la corrección"
        ),
        SimpleNamespace(
            empresa_id = empresa_id,
            trabajador_id = id_trabajador,
            tipo_correccion=TipoCorreccionEnum.ALTA_MANUAL,
            tipo_evento_id=uuid4(),
            motivo="Motivo de la corrección"
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = correcciones

    response = obtener_correcciones_por_empresa(
        request=request,
        id_empresa=empresa_id,
        db = db,
        usuario_actual=usuario
    )
    
    assert response == correcciones

