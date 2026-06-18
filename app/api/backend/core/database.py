from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import sessionmaker
# from sqlalchemy.ext.automap import automap_base
# from sqlalchemy.orm import Session

# DATABASE_URL = "sqlite:///./database/test.db"
DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/registrohorariosimple"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Base = automap_base()
# Base.prepare(engine, reflect=True)

# # Printing table names
# print(Base.classes.keys())

# # Creating Python objects
# Film = Base.classes.film
# Language = Base.classes.language

# # Querying film titles
# session = Session(engine)
# query = session.query(Film).limit(10)
# for film in query:
#     print(film.title)

# Guetting the first row of language table
# lang = session.query(Language).first()

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()  

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()  

def next_id(model):
    with get_db_context() as db:
        last_object = db.query(model).order_by(model.id.desc()).first()
        db.close()
        if last_object:
            return last_object.id + 1
        else:
            return 1