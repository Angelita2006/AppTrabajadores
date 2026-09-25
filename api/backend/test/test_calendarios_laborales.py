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

from routes.calendarios_laborales import (
    crear_calendario_laboral,
    actualizar_calendario_laboral,
    dar_de_baja_calendario_laboral,
    obtener_calendarios_y_festivos_empresa,
    obtener_calendarios_empresa,
    obtener_calendarios_centro,
    obtener_calendario_laboral,
)

from schemas.calendarios_festivos import (
    CalendarioLaboralCreate,
    CalendarioLaboralUpdate,
)

def test_crear_calendario_laboral():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    calendario_data = CalendarioLaboralCreate(
        empresa_id=usuario.empresa_id,
        anio=2026,
        nombre="Calendario Laboral de Prueba",
        descripcion="Calendario laboral para pruebas"
    )

    response = crear_calendario_laboral(
        request=request,
        db=db,
        obj_in=calendario_data,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.add.call_count == 2
    db.commit.assert_called_once()

def test_actualizar_calendario_laboral():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    id_calendario = uuid4()

    calendario = SimpleNamespace(
        id=id_calendario,
        empresa_id=usuario.empresa_id,
        anio=2025,
        nombre="Calendario Laboral de Prueba",
        activo=False,
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = calendario
    db.query.return_value.options.return_value.filter.return_value.first.return_value = calendario

    calendario_data = CalendarioLaboralUpdate(
        anio=2026,
        nombre="Calendario Laboral Actualizado",
        activo=True,
        model_config={"from_attributes": True}
    )

    response = actualizar_calendario_laboral(
        id_calendario=id_calendario,
        request=request,
        db=db,
        obj_in=calendario_data,
        usuario_actual=usuario
    )

    assert response is calendario
    assert calendario.anio == 2026
    assert calendario.nombre == "Calendario Laboral Actualizado"
    assert calendario.activo is True
    db.commit.assert_called_once()

def test_dar_de_baja_calendario_laboral():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    id_calendario = uuid4()

    calendario = SimpleNamespace(
        id=id_calendario,
        empresa_id=usuario.empresa_id,
        anio=2025,
        nombre="Calendario Laboral de Prueba",
        activo=True,
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = calendario

    response = dar_de_baja_calendario_laboral(
        id_calendario=id_calendario,
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Calendario laboral ({id_calendario}) desactivado correctamente y enviado a la papelera."
    }
    assert calendario.activo is False
    db.commit.assert_called_once()

def test_obtener_calendarios_y_festivos_empresa():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    empresa_id = usuario.empresa_id

    calendarios = [
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, anio=2025, nombre="Calendario 2025", activo=True, centro_trabajo_id=None, empresa=None, centro_trabajo=None),
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, anio=2026, nombre="Calendario 2026", activo=True, centro_trabajo_id=None, empresa=None, centro_trabajo=None),
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=empresa_id)
    db.query.return_value.options.return_value.filter.return_value.all.return_value = calendarios

    response = obtener_calendarios_y_festivos_empresa(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_empresa=empresa_id
    )

    assert len(response) == len(calendarios)
    assert [calendario.id for calendario in response] == [calendario.id for calendario in calendarios]
    assert all(calendario.festivos == [] for calendario in response)

def test_obtener_calendarios_empresa():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    empresa_id = usuario.empresa_id

    calendarios = [
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, anio=2025, nombre="Calendario 2025", activo=True, centro_trabajo_id=None, empresa=None, centro_trabajo=None),
        SimpleNamespace(id=uuid4(), empresa_id=empresa_id, anio=2026, nombre="Calendario 2026", activo=True, centro_trabajo_id=None, empresa=None, centro_trabajo=None),
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(id=empresa_id)
    db.query.return_value.options.return_value.filter.return_value.all.return_value = calendarios

    response = obtener_calendarios_empresa(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_empresa=empresa_id
    )

    assert len(response) == len(calendarios)
    assert [calendario.id for calendario in response] == [calendario.id for calendario in calendarios]

def test_obtener_calendarios_centro():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    centro_trabajo_id = uuid4()

    calendarios = [
        SimpleNamespace(id=uuid4(), empresa_id=usuario.empresa_id, anio=2025, nombre="Calendario 2025", activo=True, centro_trabajo_id=centro_trabajo_id, empresa=None, centro_trabajo=None),
        SimpleNamespace(id=uuid4(), empresa_id=usuario.empresa_id, anio=2026, nombre="Calendario 2026", activo=True, centro_trabajo_id=centro_trabajo_id, empresa=None, centro_trabajo=None),
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(
        id=centro_trabajo_id,
        empresa_id=usuario.empresa_id,
    )
    db.query.return_value.options.return_value.filter.return_value.all.return_value = calendarios

    response = obtener_calendarios_centro(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_centro=centro_trabajo_id
    )

    assert len(response) == len(calendarios)
    assert [calendario.id for calendario in response] == [calendario.id for calendario in calendarios]

def test_obtener_calendario_laboral():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com")
    calendario_id = uuid4()

    calendario = SimpleNamespace(
        id=calendario_id,
        empresa_id=usuario.empresa_id,
        anio=2025,
        nombre="Calendario 2025",
        activo=True,
        centro_trabajo_id=None,
        empresa=None,
        centro_trabajo=None
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = calendario
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

    response = obtener_calendario_laboral(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_calendario=calendario_id
    )

    assert response.id == calendario.id
    assert response.nombre == calendario.nombre
    assert response.anio == calendario.anio
    assert response.festivos == []