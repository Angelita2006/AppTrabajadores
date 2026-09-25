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
from routes.resumenes_jornada import (
    obtener_resumenes_por_trabajador,
    obtener_cuadro_mandos_diario_empresa,
    crear_o_actualizar_resumen,
    consolidar_jornada_mensual
)

from schemas.resumenes_jornada import (
    ResumenJornadaCreate
)

def test_obtener_resumenes_por_trabajador():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    trabajador_id = uuid4()
    trabajador = SimpleNamespace(id=trabajador_id, empresa_id=empresa.id)

    resumenes = [
        SimpleNamespace(
            empresa_id=empresa.id,
            trabajador_id=trabajador_id,
            fecha = date.today,
        ),
        SimpleNamespace(
            empresa_id=empresa.id,
            trabajador_id=trabajador_id,
            fecha = date.today,
        )
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = resumenes

    response = obtener_resumenes_por_trabajador(
        request=request,
        id_trabajador=trabajador_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == resumenes

def test_obtener_cuadro_mandos_diario_empresa():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    trabajador_id = uuid4()
    trabajador = SimpleNamespace(id=trabajador_id, empresa_id=empresa.id)

    resumenes = [
        SimpleNamespace(
            empresa_id=empresa.id,
            trabajador_id=trabajador_id,
            fecha = date.today,
        ),
        SimpleNamespace(
            empresa_id=empresa.id,
            trabajador_id=trabajador_id,
            fecha = date.today,
        )
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = trabajador
    db.query.return_value.options.return_value.filter.return_value.all.return_value = resumenes

    response = obtener_cuadro_mandos_diario_empresa(
        request=request,
        id_empresa=empresa.id,
        fecha_dia=date.today,
        db=db,
        usuario_actual=usuario
    )

    assert response == resumenes

def test_crear_o_actualizar_resumen():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    trabajador = SimpleNamespace(id=uuid4(), empresa_id=empresa.id)

    resumen_data = ResumenJornadaCreate(
        empresa_id=empresa.id,
        trabajador_id=trabajador.id,
        fecha=date.today(),
        minutos_trabajados=90,
        minutos_pausa=15,
        minutos_extra=15,
        tiene_incidencia=False
    )

    db = MagicMock()
    resumen_creado = SimpleNamespace(
        id=uuid4(),
        empresa_id=empresa.id,
        trabajador_id=trabajador.id,
        cerrado=False,
    )
    db.query.return_value.filter.return_value.first.side_effect = [
        empresa,
        trabajador,
        None,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = resumen_creado

    response = crear_o_actualizar_resumen(
        request=request,
        obj_in=resumen_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_consolidar_jornada_mensual():
    request = MagicMock(spec=Request)
    empresa = SimpleNamespace(id=uuid4())
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa.id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA, activo=True)
    trabajador = SimpleNamespace(id=uuid4(), empresa_id=empresa.id)

    id_resumen = uuid4()
    db = MagicMock()
    resumen_creado = SimpleNamespace(
        id=id_resumen,
        empresa_id=empresa.id,
        trabajador_id=trabajador.id,
        cerrado=False,
    )
    db.query.return_value.filter.return_value.first.return_value = resumen_creado
    db.query.return_value.options.return_value.filter.return_value.first.return_value = resumen_creado

    response = consolidar_jornada_mensual(
        request=request,
        id_resumen=id_resumen,
        db=db,
        usuario_actual=usuario
    )

    assert response == resumen_creado
    assert resumen_creado.cerrado is True