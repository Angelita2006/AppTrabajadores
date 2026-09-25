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

from core.enums import TipoUsuarioEnum
from routes.festivos import(
    crear_festivo,
    editar_festivo,
    dar_de_baja_festivo_manual,
    obtener_festivos_por_calendario
)

from schemas.calendarios_festivos import(
    FestivoCreate,
    FestivoUpdate
)

def test_crear_festivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    calendario_id = uuid4()
    calendario = SimpleNamespace(id=calendario_id, empresa_id=empresa_id)
    festivo_creado = SimpleNamespace(id=uuid4(), calendario_id=calendario_id)

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        calendario,
        None,
        festivo_creado,
    ]

    festivo_data = FestivoCreate(
        calendario_id=calendario_id,
        fecha=date.today(),
        tipo="nacional"
    )

    response = crear_festivo(
        request=request,
        obj_in=festivo_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1 

def test_editar_festivo():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    calendario_id = uuid4()
    festivo_id = uuid4()
    calendario = SimpleNamespace(id=calendario_id, empresa_id=empresa_id)
    festivo_creado = SimpleNamespace(id=festivo_id, calendario_id=calendario_id)

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        festivo_creado,
        calendario,
        festivo_creado,
    ]

    festivo_data = FestivoUpdate(
        calendario_id=calendario_id,
        fecha=date.today(),
        tipo="nacional",
        descripcion="Descripción del festivo"
    )

    response = editar_festivo(
        request=request,
        id_festivo=festivo_id,
        obj_in=festivo_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == festivo_creado
    db.commit.assert_called_once()
    
def test_dar_de_baja_festivo_manual():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    calendario_id = uuid4()
    festivo_id = uuid4()
    calendario = SimpleNamespace(id=calendario_id, empresa_id=empresa_id)
    festivo_creado = SimpleNamespace(
        id=festivo_id,
        calendario_id=calendario_id,
        calendario=calendario,
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.side_effect = [
        festivo_creado,
    ]

    response = dar_de_baja_festivo_manual(
        request=request,
        id_festivo=festivo_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Día festivo ({festivo_id}) desactivado correctamente y enviado a la papelera."
    }
    assert festivo_creado.activo is False
    assert festivo_creado.updated_at is not None
    db.commit.assert_called_once()

def test_obtener_festivos_por_calendario():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    calendario_id = uuid4()
    festivo_id = uuid4()
    calendario = SimpleNamespace(id=calendario_id, empresa_id=empresa_id)
    festivos = [
         SimpleNamespace(id=festivo_id, calendario_id=calendario_id),
          SimpleNamespace(id=festivo_id, calendario_id=calendario_id)
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = calendario
    db.query.return_value.options.return_value.filter.return_value.order_by.return_value.all.return_value = festivos

    response = obtener_festivos_por_calendario(
        request=request,
        id_calendario=calendario_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == festivos
