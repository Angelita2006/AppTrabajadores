import datetime
import uuid

from sqlalchemy import DateTime, ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class ContratosCentrosTrabajo(Base):
    """Centros de trabajo asociados a un contrato laboral."""

    __tablename__ = "contratos_centros_trabajo"
    __table_args__ = (
        PrimaryKeyConstraint("id", name="contratos_centros_trabajo_pkey"),
        ForeignKeyConstraint(
            ["empresa_id", "contrato_id"],
            ["contratos.empresa_id", "contratos.id"],
            ondelete="CASCADE",
            name="contratos_centros_trabajo_contrato_fkey",
        ),
        ForeignKeyConstraint(
            ["empresa_id", "centro_trabajo_id"],
            ["centros_trabajo.empresa_id", "centros_trabajo.id"],
            ondelete="RESTRICT",
            name="contratos_centros_trabajo_centro_fkey",
        ),
        UniqueConstraint(
            "empresa_id",
            "contrato_id",
            "centro_trabajo_id",
            name="contratos_centros_trabajo_empresa_contrato_centro_key",
        ),
        {"comment": "Centros físicos donde se puede desarrollar un contrato laboral."},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        nullable=False,
        server_default=text("gen_random_uuid()"),
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    contrato_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    centro_trabajo_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(True), nullable=False, server_default=text("now()")
    )

    contrato: Mapped["Contratos"] = relationship("Contratos", back_populates="centros_trabajo_relaciones", overlaps="contratos_relaciones,centro_trabajo")  # type: ignore
    centro_trabajo: Mapped["CentrosTrabajo"] = relationship("CentrosTrabajo", back_populates="contratos_relaciones", overlaps="centros_trabajo_relaciones,contrato")  # type: ignore
