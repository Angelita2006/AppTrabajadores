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

from routes.departamentos import (
    crear_departamento,
    editar_departamento,
    dar_de_baja_departamento,
    obtener_departamentos_empresa,
    obtener_departamento
)

from schemas.departamentos import (
    DepartamentoCreate, DepartamentoUpdate
)

def test_crear_departamento():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    departamento_data = DepartamentoCreate(
        empresa_id= empresa_id,
        nombre="Departamento Ejemplo",
        centro_trabajo_id=uuid4()
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario

    response = crear_departamento(
        request=request,
        obj_in=departamento_data,
        db = db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_editar_departamento():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    departamento_existente = SimpleNamespace(
        id=uuid4(),
        empresa_id = empresa_id,
        nombre="Departamento Ejemplo"
    )

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = departamento_existente

    departamento_data = DepartamentoUpdate(
        empresa_id = empresa_id,
        nombre="Departamento Ejemplo"
    )

    response = editar_departamento(
        request=request,
        id_departamento=uuid4(),
        obj_in=departamento_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == departamento_existente
    db.commit.assert_called_once()

def test_dar_de_baja_departamento():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    departamento_id = uuid4()
    departamento = SimpleNamespace(
        id=departamento_id,
        empresa_id=empresa_id,
        activo=True,
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = departamento

    response = dar_de_baja_departamento(
        request=request,
        id_departamento=departamento_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == {
        "detail": f"Departamento ({departamento_id}) desactivado correctamente y enviado a la papelera."
    }
    assert departamento.activo is False
    db.commit.assert_called_once()

def test_obtener_departamentos_empresa():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    departamentos = [
        SimpleNamespace(
            empresa_id = empresa_id,
            nombre="Departamento Ejemplo 1"
        ),
        SimpleNamespace(
            empresa_id = empresa_id,
            nombre="Departamento Ejemplo 2"
        )
    ]

    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.all.return_value = departamentos

    response = obtener_departamentos_empresa(
        request=request,
        id_empresa=empresa_id,
        db=db,
        usuario_actual=usuario
    )

    assert response == departamentos

def test_obtener_departamento():
    request = MagicMock(spec=Request)
    empresa_id = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=empresa_id, email="admin@example.com")

    departamento = SimpleNamespace(
        id=uuid4(),
        empresa_id = empresa_id,
        nombre="Departamento Ejemplo 1"
    )
        
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = departamento

    response = obtener_departamento(
        request=request,
        id_departamento=departamento.id,
        db=db,
        usuario_actual=usuario
    )

    assert response == departamento