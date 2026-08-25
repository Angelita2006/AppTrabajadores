import datetime
from typing import Optional
import uuid
from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base

class DispositivosPush(Base):
    __tablename__ = 'dispositivos_push'
    __table_args__ = (
        ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE', name='dispositivos_push_usuario_id_fkey'),
        PrimaryKeyConstraint('id', name='dispositivos_push_pkey'),
        {'comment': 'Almacena los tokens FCM para el envío de notificaciones push a la app móvil.'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fcm_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    plataforma: Mapped[Optional[str]] = mapped_column(String(20)) # 'ios', 'android', 'web'
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))

    # Relación ORM
    usuario: Mapped['Usuarios'] = relationship('Usuarios', back_populates='dispositivos_push') # type: ignore