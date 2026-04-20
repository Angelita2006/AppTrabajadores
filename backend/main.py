from fastapi import FastAPI
from backend.models import Horario
from database import SessionLocal, engine, Base, get_db, next_id, datetime
from models import Empresa, Fichaje, Trabajador

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API para gestionar fichajes, horarios, trabajadores y empresas.",
    version="1.0.0",
    openapi_url="/api",
    openapi_tags=[
        {
            "name": "Fichajes",
            "description": "Operaciones relacionadas con los fichajes de los trabajadores."
        },
        {
            "name": "Horarios",
            "description": "Operaciones relacionadas con los horarios de los trabajadores."
        },
        {
            "name": "Trabajadores",
            "description": "Operaciones relacionadas con los trabajadores."
        },
        {
            "name": "Empresas",
            "description": "Operaciones relacionadas con las empresas."
        }
    ] 
)

Base.metadata.create_all(bind=engine)

###################### RUTAS PARA FICHAJES ####################
@app.post("/fichaje")
def crear_fichaje(idTrabajador: int, idEmpresa: int, tipo: str):
    db = get_db() 
    fichaje = Fichaje(
        idFichaje=next_id(Fichaje), 
        idTrabajador=idTrabajador,
        idEmpresa=idEmpresa,
        tipo=tipo,
        fecha_hora=datetime.now(),  # Fecha y hora actual
        trabajador=Trabajador.get_trabajador(idTrabajador), # Obtener el trabajador por su ID
        empresa=Empresa.get_empresa(idEmpresa) # Obtener la empresa por su ID
    )
    db.add(fichaje)
    db.commit()
    db.refresh(fichaje)
    db.close()

    uri = f"/fichaje/{fichaje.id}"
    headers = {"Location": uri}

    return JSONResponse(status_code=201, content=ItemSchema.from_orm(fichaje).dict(), headers=headers)

@app.get("/fichajes")
def obtener_fichajes():
    db = SessionLocal()
    fichajes = db.query(Fichaje).all()
    db.close()
    return fichajes

@app.get("/fichajes/{idFichaje}")
def obtener_fichaje(idFichaje: int):
    db = SessionLocal()
    fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje).first()
    db.close()
    if fichaje is None:
        return {"error": "Fichaje no encontrado"}
    return fichaje

####################### RUTAS PARA HORARIOS ####################
@app.post("/horario")
def crear_horario(
    idTrabajador: int, 
    idEmpresa: int, 
    tipoJornada: str, 
    dias: int, 
    dias_semana: str, 
    hora_entrada: datetime, 
    hora_salida: datetime
):
    db = get_db()  
    horario = Horario(
        id=next_id(Horario),
        idTrabajador=idTrabajador,
        idEmpresa=idEmpresa,
        tipoJornada=tipoJornada,
        dias=dias,
        dias_semana=dias_semana,
        hora_entrada=hora_entrada,
        hora_salida=hora_salida,
        trabajador=Trabajador.get_trabajador(idTrabajador), # Obtener el trabajador por su ID
        empresa=Empresa.get_empresa(idEmpresa) # Obtener la empresa por su ID
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    db.close()

    uri = f"/horario/{horario.id}"
    headers = {"Location": uri}

    return JSONResponse(status_code=201, content=ItemSchema.from_orm(horario).dict(), headers=headers)

@app.get("/horarios")
def obtener_horarios():
    db = SessionLocal()
    horarios = db.query(Horario).all()
    db.close()
    return horarios

@app.get("/horarios/{idHorario}")
def obtener_horario(idHorario: int):
    db = SessionLocal()
    horario = db.query(Horario).filter(Horario.id == idHorario).first()
    db.close()
    if horario is None:
        return {"error": "Horario no encontrado"}
    return horario

@app.get("/horarios/trabajador/{idTrabajador}/empresa/{idEmpresa}")
def obtener_horarios_por_trabajador_y_empresa(idTrabajador: int, idEmpresa: int):
    db = SessionLocal()
    horarios = db.query(Horario).filter(Horario.idTrabajador == idTrabajador, Horario.idEmpresa == idEmpresa).all()
    db.close()
    return horarios

#################### RUTAS PARA TRABAJADORES ####################
@app.post("/trabajador")
def crear_trabajador(nombre: str, apellidos: str, dni: str, direccion: str, codigo_postal: str, poblacion: str, provincia: str, cuenta_bancaria: str, email: str, password: str):
    db = get_db()
    # Create a new Trabajador instance
    trabajador = Trabajador(
        id=next_id(Trabajador),
        nombre=nombre,
        apellidos=apellidos,
        dni=dni,
        direccion=direccion,
        codigo_postal=codigo_postal,
        poblacion=poblacion,
        provincia=provincia,
        cuenta_bancaria=cuenta_bancaria,
        email=email,
        password=password,
        fichajes=[],  # Inicializar la lista de fichajes vacía
        horarios=[],  # Inicializar la lista de horarios vacía
        empresas=[]  # Inicializar la lista de empresas vacía
    )
    db.add(trabajador)
    db.commit()
    db.refresh(trabajador)
    db.close()

    uri = f"/trabajador/{trabajador.id}"
    headers = {"Location": uri}

    return JSONResponse(status_code=201, content=ItemSchema.from_orm(trabajador).dict(), headers=headers)

@app.put("/trabajador/{idTrabajador}/empresas/{idEmpresa}")
def agregar_empresa_a_trabajador(idTrabajador: int, idEmpresa: int):    
    db = get_db()
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    if not trabajador:
        return {"error": "Trabajador no encontrado"}
    empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
    if not empresa:
        return {"error": "Empresa no encontrada"}
    if empresa not in trabajador.empresas:
        trabajador.empresas.append(empresa)
    db.commit()
    db.refresh(trabajador)
    db.close()
    return trabajador

@app.put("/trabajador/{idTrabajador}/horarios/{idHorario}")
def agregar_horario_a_trabajador(idTrabajador: int, idHorario: int):
    db = get_db()
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    if not trabajador:
        return {"error": "Trabajador no encontrado"}
    horario = db.query(Horario).filter(Horario.id == idHorario).first()
    if not horario:
        return {"error": "Horario no encontrado"}
    if horario not in trabajador.horarios:
        trabajador.horarios.append(horario)
    db.commit()
    db.refresh(trabajador)
    db.close()
    return trabajador

@app.put("/trabajador/{idTrabajador}/fichajes/{idFichaje}")
def agregar_horario_a_trabajador(idTrabajador: int, idFichaje: int):
    db = get_db()
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    if not trabajador:
        return {"error": "Trabajador no encontrado"}
    fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje).first()
    if not horario:
        return {"error": "Fichaje no encontrado"}
    if fichaje not in trabajador.fichajes:
        trabajador.fichajes.append(fichaje)
    db.commit()
    db.refresh(trabajador)
    db.close()
    return trabajador

@app.get("/trabajadores")
def obtener_trabajadores():
    db = SessionLocal()
    trabajadores = db.query(Trabajador).all()
    db.close()
    return trabajadores

@app.get("/trabajadores/{idTrabajador}")
def obtener_trabajador(idTrabajador: int):
    db = SessionLocal()
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    db.close()
    if trabajador is None:
        return {"error": "Trabajador no encontrado"}
    return trabajador

##################### RUTAS PARA EMPRESAS ####################
@app.post("/empresa")
def crear_empresa(nombre: str, cif: str, direccion: str, codigo_postal: str, poblacion: str, provincia: str):
    db = get_db()
    # Create a new Empresa instance
    empresa = Empresa(
        id=next_id(Empresa),
        nombre=nombre,
        cif=cif,
        direccion=direccion,
        codigo_postal=codigo_postal,
        poblacion=poblacion,
        provincia=provincia,
        trabajadores=[]  # Inicializar la lista de trabajadores vacía
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    db.close()

    uri = f"/empresa/{empresa.id}"
    headers = {"Location": uri}

    return JSONResponse(status_code=201, content=ItemSchema.from_orm(empresa).dict(), headers=headers)

@app.put("/empresa/{idEmpresa}/trabajadores/{idTrabajador}")
def agregar_trabajador_a_empresa(idEmpresa: int, idTrabajador: int):
    db = get_db()
    empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
    if not empresa:
        return {"error": "Empresa no encontrada"}
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    if not trabajador:
        return {"error": "Trabajador no encontrado"}
    if trabajador not in empresa.trabajadores:
        empresa.trabajadores.append(trabajador)
    db.commit()
    db.refresh(empresa)
    db.close()
    return empresa

@app.get("/trabajadores")
def obtener_trabajadores():
    db = SessionLocal()
    trabajadores = db.query(Trabajador).all()
    db.close()
    return trabajadores

@app.get("/trabajadores/{idTrabajador}")
def obtener_trabajador(idTrabajador: int):
    db = SessionLocal()
    trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    db.close()
    if trabajador is None:
        return {"error": "Trabajador no encontrado"}
    return trabajador


