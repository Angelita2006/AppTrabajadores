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

from routes.asignaciones_turno import (
    asignar_turno_trabajador,
    asignar_turnos_masivamente,
    editar_asignacion_turno,
    poner_fecha_creacion_asignacion_turno,
    finalizar_vigencia_turno,
    eliminar_asignacion_turno,
    eliminar_todas_asignaciones_trabajador,
    obtener_asignaciones_por_trabajador,
)
import routes.asignaciones_turno as asignaciones_turno_route
from schemas.asignaciones_turno import AsignacionTurnoCreate, AsignacionTurnoMasivaCreate, AsignacionTurnoUpdate

def test_asignar_turno_trabajador(monkeypatch):
    # Crear un objeto Request simulado
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()
    turno_id = uuid4()
    asignacion_creada = SimpleNamespace(
        trabajador_id=trabajador_id,
        turno_id=turno_id,
    )
    trabajador = SimpleNamespace(empresa_id=uuid4())
    turno = SimpleNamespace(id=turno_id)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        trabajador,
        turno,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = asignacion_creada
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    # Crear un objeto AsignacionTurnoCreate de ejemplo
    asignacion_data = AsignacionTurnoCreate(
        trabajador_id=trabajador_id,
        turno_id=turno_id,
        fecha_inicio=date(2024, 6, 1),
        fecha_fin=date(2024, 6, 30)
    )

    # Llamar a la función asignar_turno_trabajador
    response = asignar_turno_trabajador(
        request=request,
        obj_in=asignacion_data,
        db=db,
        usuario_actual=usuario,
    )

    # Verificar que la respuesta contiene la asignación creada
    assert response is asignacion_creada
    db.add.assert_called_once()
    db.commit.assert_called_once()

def test_asignar_turnos_masivamente(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()
    turno_ids = [uuid4(), uuid4()]
    asignaciones_creadas = []
    for turno_id in turno_ids:
        asignaciones_creadas.append(SimpleNamespace(
            trabajador_id=trabajador_id,
            turno_id=turno_id,
        ))

    trabajador = SimpleNamespace(empresa_id=uuid4())
    turnos = [SimpleNamespace(id=turno_id) for turno_id in turno_ids]
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [trabajador] + turnos
    db.query.return_value.options.return_value.filter.return_value.all.return_value = asignaciones_creadas
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    # Crear un objeto AsignacionTurnoMasivaCreate de ejemplo
    asignacion_masiva_data = AsignacionTurnoMasivaCreate(
        trabajador_id=trabajador_id,
        turnos_ids=turno_ids,
        fecha_inicio=date(2024, 6, 1),
        fecha_fin=date(2024, 6, 30)
    )

    # Llamar a la función asignar_turnos_masivamente
    response = asignar_turnos_masivamente(
        request=request,
        obj_in=asignacion_masiva_data,
        db=db,
        usuario_actual=usuario,
    )

    # Verificar que la respuesta contiene las asignaciones creadas
    assert response == asignaciones_creadas
    db.add.assert_called()
    db.commit.assert_called()

def test_editar_asignacion_turno(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    asignacion_id = uuid4()
    trabajador_id = uuid4()
    turno_id = uuid4()
    fecha_inicio = date(2024, 6, 1)
    fecha_fin = date(2024, 6, 30)

    asignacion_existente = SimpleNamespace(
        id=asignacion_id,
        trabajador_id=trabajador_id,
        turno_id=turno_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    db = MagicMock()
    trabajador = SimpleNamespace(empresa_id=uuid4())
    db.query.return_value.filter.return_value.first.side_effect = [
        asignacion_existente,
        trabajador,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = asignacion_existente
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    # Crear un objeto AsignacionTurnoUpdate de ejemplo
    asignacion_update_data = AsignacionTurnoUpdate(
        trabajador_id=trabajador_id,
        turno_id=turno_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    # Llamar a la función editar_asignacion_turno
    response = editar_asignacion_turno(
        request=request,
        fecha_inicio=asignacion_update_data.fecha_inicio,
        fecha_fin=asignacion_update_data.fecha_fin,
        db=db,
        usuario_actual=usuario,
        id_asignacion=asignacion_id,
    )

    # Verificar que la respuesta contiene la asignación actualizada
    assert response == asignacion_existente
    db.commit.assert_called_once()

def test_poner_fecha_creacion_asignacion_turno(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    asignacion_id = uuid4()
    trabajador_id = uuid4()
    turno_id = uuid4()
    fecha_creacion = date(2024, 6, 1)
    
    asignacion_existente = SimpleNamespace(
        id=asignacion_id,
        trabajador_id=trabajador_id,
        turno_id=turno_id,
        fecha_creacion=fecha_creacion
    )

    db = MagicMock()
    trabajador = SimpleNamespace(empresa_id=uuid4())
    db.query.return_value.filter.return_value.first.side_effect = [
        asignacion_existente,
        trabajador,
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = asignacion_existente
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    poner_fecha_creacion_data = SimpleNamespace(
        fecha_creacion=fecha_creacion
    )

    # Llamar a la función poner_fecha_creacion_asignacion_turno
    response = poner_fecha_creacion_asignacion_turno(
        request=request,
        fecha_creacion=poner_fecha_creacion_data.fecha_creacion,
        db=db,
        usuario_actual=usuario,
        id_asignacion=asignacion_id,
    )

    # Verificar que la respuesta contiene la asignación actualizada
    assert response == asignacion_existente
    db.commit.assert_called_once()

def test_finalizar_vigencia_turno(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    asignacion_id = uuid4()
    trabajador_id = uuid4()
    turno_id = uuid4()
    fecha_fin = date(2024, 6, 1)

    finalizacion_existente = SimpleNamespace(
        id=asignacion_id,
        trabajador_id=trabajador_id,
        turno_id=turno_id,
        fecha_inicio=date(2024, 1, 1),
        fecha_fin=fecha_fin
    )

    db = MagicMock()
    trabajador = SimpleNamespace(empresa_id=uuid4())
    db.query.return_value.filter.return_value.first.side_effect = [
        finalizacion_existente,
        trabajador
    ]
    db.query.return_value.options.return_value.filter.return_value.first.return_value = finalizacion_existente
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    finalizar_vigencia_data = SimpleNamespace(
        fecha_fin=fecha_fin
    )

    response = finalizar_vigencia_turno(
        request=request,
        fecha_fin=finalizar_vigencia_data.fecha_fin,
        db=db,
        usuario_actual=usuario,
        id_asignacion=asignacion_id,
    )
    assert response == finalizacion_existente
    assert finalizacion_existente.fecha_fin == fecha_fin
    db.commit.assert_called_once()

def test_eliminar_asignacion_turno(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    asignacion_id = uuid4()
    trabajador_id = uuid4()
    asignacion = SimpleNamespace(
        id=asignacion_id,
        trabajador_id=trabajador_id,
    )
    trabajador = SimpleNamespace(empresa_id=uuid4())

    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [
        asignacion,
        trabajador,
    ]
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    response = eliminar_asignacion_turno(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_asignacion=asignacion_id,
    )
    assert response["detail"] == f"Asignación ({asignacion_id}) eliminada correctamente del cuadrante."
    db.delete.assert_called_once_with(asignacion)
    db.commit.assert_called_once()

def test_eliminar_todas_asignaciones_trabajador(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()

    asignaciones = [
        SimpleNamespace(id=uuid4(), trabajador_id=trabajador_id),
        SimpleNamespace(id=uuid4(), trabajador_id=trabajador_id),
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = asignaciones
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    response = eliminar_todas_asignaciones_trabajador(
        request=request,
        db=db,
        usuario_actual=usuario,
        trabajador_id=trabajador_id,
    )
    assert response["detail"] == f"Se han eliminado {len(asignaciones)} asignaciones del trabajador."
    for asignacion in asignaciones:
        db.delete.assert_any_call(asignacion)
    db.commit.assert_called_once()

def test_obtener_asignaciones_por_trabajador(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), email="admin@example.com")
    trabajador_id = uuid4()

    asignaciones = [
        SimpleNamespace(id=uuid4(), trabajador_id=trabajador_id),
        SimpleNamespace(id=uuid4(), trabajador_id=trabajador_id),
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = asignaciones
    monkeypatch.setattr(asignaciones_turno_route, "registrar_auditoria", MagicMock())

    response = obtener_asignaciones_por_trabajador(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_trabajador=trabajador_id,
    )
    assert response == asignaciones