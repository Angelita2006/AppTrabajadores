import os
import sys
from pathlib import Path

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from starlette.requests import Request

_backend_path = str(Path(__file__).resolve().parents[1])
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main

from routes.auditoria_accesos import (
    registrar_acceso_auditoria,
    obtener_auditoria_empresa,
    obtener_auditoria_por_trabajador,
)
from core.enums import AccionAuditoriaEnum
from schemas.auditoria_accesos import AuditoriaAccesoCreate

def test_registrar_acceso_auditoria():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()

    acceso_registrado = SimpleNamespace(
        usuario_id=usuario.id,
        trabajador_id=trabajador_id,
        empresa_id=usuario.empresa_id,
        accion="consulta",
        detalle={"info": "test"},
        ip_address="127.0.0.1"
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
    db.query.return_value.options.return_value.filter.return_value.first.return_value = acceso_registrado

    acceso_registrado_data = AuditoriaAccesoCreate(
        empresa_id=usuario.empresa_id,
        accion=AccionAuditoriaEnum.CONSULTA,
        usuario_id=usuario.id,
        trabajador_id=trabajador_id,
        detalle= {"info": "test"},
        ip_address="127.0.0.1"
    )

    response = registrar_acceso_auditoria(
        request=request,
        db=db,
        obj_in=acceso_registrado_data,
        usuario_actual=usuario
    )

    assert response is acceso_registrado
    db.add.assert_called_once()
    db.commit.assert_called_once()

def test_obtener_auditoria_empresa():
    id_empresa = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com")

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = []

    response = obtener_auditoria_empresa(
        db=db,
        id_empresa=id_empresa,
        usuario_actual=usuario_actual
    )

    assert response == []
    db.query.assert_called_once()

def test_obtener_auditoria_por_trabajador():
    id_trabajador = uuid4()
    empresa_id = uuid4()
    usuario_actual = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")
    trabajador = SimpleNamespace(id=id_trabajador, empresa_id=empresa_id)

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.all.return_value = []

    response = obtener_auditoria_por_trabajador(
        db=db,
        id_trabajador=id_trabajador,
        usuario_actual=usuario_actual
    )

    assert response == []
    assert db.query.call_count == 2