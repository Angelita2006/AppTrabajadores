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

from routes.auth import (
    solicitar_recuperacion_password,
    confirmar_password,
)
import routes.auth as auth_route

from schemas.auth import ConfirmarPasswordRequest, EmailRecuperacionRequest

def test_solicitar_recuperacion_password(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="user@example.com")

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario
    monkeypatch.setattr(auth_route, "enviar_correo_recuperacion", MagicMock())
    monkeypatch.setattr(auth_route, "registrar_auditoria", MagicMock())

    payload = EmailRecuperacionRequest(email=usuario.email)

    response = solicitar_recuperacion_password(
        request=request,
        db=db,
        payload=payload
    )

    assert response == {
        "status": "success",
        "message": "Se ha enviado un código de verificación a tu correo electrónico."
    }
    assert usuario.codigo_recuperacion.isdigit()
    assert len(usuario.codigo_recuperacion) == 6
    db.add.assert_called_once_with(usuario)
    db.commit.assert_called_once()

def test_confirmar_password(monkeypatch):
    request = MagicMock(spec=Request)
    usuario = SimpleNamespace(id=uuid4(), empresa_id=uuid4(), email="user@example.com")
    usuario.codigo_recuperacion = "123456"
    usuario.codigo_expira_at = None
    nueva_password = "new_password"

    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = usuario
    monkeypatch.setattr(auth_route, "registrar_auditoria", MagicMock())

    payload = ConfirmarPasswordRequest(
        codigo_verificacion=usuario.codigo_recuperacion,
        nueva_password=nueva_password,
        email=usuario.email,
    )

    response = confirmar_password(
        request=request,
        db=db,
        payload=payload
    )

    assert response == {
        "status": "success",
        "message": "Tu contraseña ha sido actualizada correctamente."
    }
    assert usuario.password_hash != nueva_password
    assert usuario.codigo_recuperacion is None
    assert usuario.codigo_expira_at is None
    db.add.assert_called_once_with(usuario)
    db.commit.assert_called_once()
