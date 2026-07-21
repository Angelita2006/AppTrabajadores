from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import sessionmaker

# DATABASE_URL = "sqlite:///./database/test.db"
# DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/registrohorariosimple"
DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/registrohorariosimpledev"
# DATABASE_URL = "mysql+pymysql://mariangeles:postgres@localhost:3306/registrohorariosimple"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()  