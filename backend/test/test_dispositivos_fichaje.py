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

from core.enums import MetodoFichajeEnum
from routes.dispositivos_fichaje import (
    registrar_dispositivo,
    cambiar_estado_dispositivo,
    actualizar_dispositivo,
    dar_de_baja_dispositivo,
    obtener_dispositivo,
    obtener_dispositivos_empresa,
    obtener_dispositivos_centro,
)

from schemas.dispositivos_fichaje import(
    DispositivoFichajeCreate
)

def test_registrar_dispositivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    dispositivo_fichaje_data = DispositivoFichajeCreate(
        empresa_id= empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL,
        activo=True
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = registrar_dispositivo(
        request=request,
        obj_in=dispositivo_fichaje_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_cambiar_estado_dispositivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    dispositivo_existente = SimpleNamespace(
        empresa_id=empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL,
        activo=False
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        dispositivo_existente
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = dispositivo_existente

    cambiar_estado = SimpleNamespace(
       activo = True
    )

    response = cambiar_estado_dispositivo(
        request = request,
        id_dispositivo=uuid4(),
        activo = cambiar_estado,
        db = db,
        usuario_actual=usuario
    )

    assert response == dispositivo_existente
    db.commit.assert_called_once()

def test_actualizar_dispositivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    dispositivo_existente = SimpleNamespace(
        empresa_id=empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL,
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        dispositivo_existente
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = dispositivo_existente

    dispositivo_data = SimpleNamespace(
        empresa_id=empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL,
        centro_trabajo_id=None,
        activo=None,
    )

    response = actualizar_dispositivo(
        request=request,
        id_dispositivo=uuid4(),
        obj_in=dispositivo_data,
        db = db,
        usuario_actual=usuario
    )

    assert response == dispositivo_existente
    db.commit.assert_called_once()

def test_dar_de_baja_dispositivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_dispositivo = uuid4()

    dispositivo = SimpleNamespace(
        id=id_dispositivo,
        empresa_id=empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = dispositivo

    response = dar_de_baja_dispositivo(
        request=request,
        id_dispositivo=id_dispositivo,
        db=db,
        usuario_actual=usuario
    )

    assert response["message"] == "Dispositivo desactivado correctamente (enviado a papelera)."
    assert dispositivo.activo is False
    assert dispositivo.updated_at is not None
    db.commit.assert_called_once()

def test_obtener_dispositivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    id_dispositivo = uuid4()
    
    dispositivo = SimpleNamespace(
        id=id_dispositivo,
        empresa_id=empresa_id,
        tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = dispositivo

    response = obtener_dispositivo(
        request=request,
        id_dispositivo=id_dispositivo,
        db=db,
        usuario_actual=usuario
    )

    assert response == dispositivo

def test_obtener_dispositivos_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    dispositivos = [
        SimpleNamespace(
            empresa_id=empresa_id,
            tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL
        ),
        SimpleNamespace(
            empresa_id=empresa_id,
            tipo_dispositivo=MetodoFichajeEnum.MANUAL
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = dispositivos

    response = obtener_dispositivos_empresa(
        request=request,
        db=db,
        id_empresa=empresa_id,
        usuario_actual=usuario
    )

    assert response == dispositivos

def test_obtener_dispositivos_centro():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    centro_trabajo_id = uuid4()

    dispositivos = [
        SimpleNamespace(
            empresa_id=empresa_id,
            tipo_dispositivo=MetodoFichajeEnum.APP_MOVIL,
            centro_trabajo_id = centro_trabajo_id
        ),
        SimpleNamespace(
            empresa_id=empresa_id,
            tipo_dispositivo=MetodoFichajeEnum.MANUAL,
            centro_trabajo_id = centro_trabajo_id
        )
    ]
    centro = SimpleNamespace(id=centro_trabajo_id, empresa_id=empresa_id)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = centro
    db.query.return_value.options.return_value.filter.return_value.all.return_value = dispositivos

    response = obtener_dispositivos_centro(
        request=request,
        db=db,
        id_centro=centro_trabajo_id,
        usuario_actual=usuario
    )

    assert response == dispositivos