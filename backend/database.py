from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.models import Fichaje

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def next_id(object: object):
    db = SessionLocal()
    last_fichaje = db.query(object).order_by(object.id.desc()).first()
    db.close()
    if last_fichaje:
        return last_fichaje.id + 1
    else:
        return 1