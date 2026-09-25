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
from routes.empresas import (
    crear_empresa,
    registrar_organizacion_completa,
    cambiar_razon_social_empresa,
    actualizar_datos_empresa,
    obtener_empresas,
    obtener_empresa,
    obtener_empresa_por_cif,
    obtener_trabajadores_empresa
)

from schemas.empresas import(
    EmpresaCreate,
    EmpresaUpdate,
)

from schemas.registro_organizacion import RegistroOrganizacionCompletaDTO

def test_crear_empresa():
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa_data = EmpresaCreate(
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )

    db = MagicMock()
    licencia = SimpleNamespace(usada=False)
    db.query.return_value.filter.return_value.first.side_effect = [licencia, None, None]

    response = crear_empresa(
        request=request,
        obj_in=empresa_data,
        db=db,
        usuario_actual=usuario
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_registrar_organizacion_completa(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa_data = RegistroOrganizacionCompletaDTO(
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo",
        direccion_fiscal="direccionejemplo",
        nombre_admin="admin",
        apellidos_admin="administrador",
        dni_nif_nie_admin="12345678A",
        email_admin="administrador@ejemplo.com",
        password_raw="1234"
    )

    db = MagicMock()
    licencia = SimpleNamespace(usada=False)
    rol = SimpleNamespace(id=uuid4())
    db.query.return_value.filter.return_value.first.side_effect = [licencia, None, None, rol]
    monkeypatch.setattr("routes.empresas.registrar_auditoria", MagicMock())

    response = registrar_organizacion_completa(
        request=request,
        payload=empresa_data,
        db=db
    )

    assert response is not None
    assert db.commit.call_count == 1

def test_cambiar_razon_social_empresa():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa_existente = SimpleNamespace(
        id=id_empresa,
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = empresa_existente

    response = cambiar_razon_social_empresa(
        request=request,
        id_empresa=id_empresa,
        nueva_razon_social="Ejemplo 2 para testeo",
        db=db,
        usuario_actual=usuario
    )

    assert response == empresa_existente
    db.commit.assert_called_once()

def test_actualizar_datos_empresa():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa_existente = SimpleNamespace(
        id=id_empresa,
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = empresa_existente

    empresa_data = EmpresaUpdate(
        razon_social="Ejemplo para testeo 2",
        cif="ejemplocif2",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo2"
    )

    response = actualizar_datos_empresa(
        request=request,
        id_empresa=id_empresa,
        payload=empresa_data,
        db=db,
        usuario_actual=usuario
    )

    assert response == empresa_existente
    db.commit.assert_called_once()

def test_obtener_empresas():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresas = [
        SimpleNamespace(
            razon_social="Ejemplo para testeo",
            cif="ejemplocif",
            zona_horaria="Europe/Madrid",
            configuracion={},
            codigo_licencia="codigoejemplo"
        ),
        SimpleNamespace(
            razon_social="Ejemplo para testeo 2",
            cif="ejemplocif2",
            zona_horaria="Europe/Madrid",
            configuracion={},
            codigo_licencia="codigoejemplo2"
        )
    ]

    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = empresas

    response = obtener_empresas(
        request=request,
        db=db,
        usuario_actual=usuario
    )

    assert response == empresas

def test_obtener_empresa():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa = SimpleNamespace(
        id=id_empresa,
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )
    
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = empresa

    response = obtener_empresa(
        request=request,
        db=db,
        usuario_actual=usuario,
        id_empresa=id_empresa
    )

    assert response == empresa

def test_obtener_empresa_por_cif():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    cif="ejemplocif"
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa = SimpleNamespace(
        id=id_empresa,
        razon_social="Ejemplo para testeo",
        cif=cif,
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo"
    )
    
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = empresa

    response = obtener_empresa_por_cif(
        request=request,
        db=db,
        usuario_actual=usuario,
        cif_empresa=cif
    )

    assert response == empresa

def test_obtener_trabajadores_empresa():
    request = MagicMock(spec=Request)
    id_empresa = uuid4()
    usuario = SimpleNamespace(id=uuid4(), empresa_id=id_empresa, email="admin@example.com", tipo_usuario=TipoUsuarioEnum.ADMIN_GESTORIA)

    empresa = SimpleNamespace(
        id=id_empresa,
        razon_social="Ejemplo para testeo",
        cif="ejemplocif",
        zona_horaria="Europe/Madrid",
        configuracion={},
        codigo_licencia="codigoejemplo",
        trabajadores=[]
    )

    trabajadores = [
        SimpleNamespace(id=uuid4(), empresa_id=usuario.empresa_id, nombre="Ana"),
        SimpleNamespace(id=uuid4(), empresa_id=usuario.empresa_id, nombre="Luis")
    ]
    empresa.trabajadores = trabajadores
    
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = empresa

    response = obtener_trabajadores_empresa(
        request=request,
        id_empresa=id_empresa,
        db=db,
        usuario_actual=usuario
    )

    assert response == trabajadores