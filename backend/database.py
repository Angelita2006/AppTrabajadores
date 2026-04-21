from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./database/test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    return db

def next_id(object: object):
    db = get_db()
    last_object = db.query(object).order_by(object.id.desc()).first()
    db.close()
    if last_object:
        return last_object.id + 1
    else:
        return 1