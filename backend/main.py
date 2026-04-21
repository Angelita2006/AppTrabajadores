from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from datetime import datetime
from backend.database import Base, SessionLocal, engine, get_db, next_id
from sqlalchemy.exc import IntegrityError
from backend.models import Empresa, Fichaje, Trabajador, Horario

app = FastAPI(
    title="API de Registro horario trabajadores",
    description="API para gestionar fichajes, horarios, trabajadores y empresas.",
    version="1.0.0",
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
    try:
        fichaje = Fichaje(
            idFichaje=next_id(Fichaje), 
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipo=tipo,
            fecha_hora=datetime.now(),  # Fecha y hora actual
            trabajador=db.query(Trabajador).filter(Trabajador.id == idTrabajador).first(), # Obtener el trabajador por su ID
            empresa=db.query(Empresa).filter(Empresa.id == idEmpresa).first() # Obtener la empresa por su ID
        )
        db.add(fichaje)
        db.commit()
        db.refresh(fichaje)
        db.close()

        uri = f"/fichaje/{fichaje.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(fichaje), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/fichaje/{idFichaje}")
def update_fichaje(idFichaje: int, idTrabajador: int, idEmpresa: int, tipo: str):
    db = get_db() 
    try:
        fichaje = Fichaje(
            idFichaje=idFichaje, 
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipo=tipo,
            fecha_hora=datetime.now()
        )
        db.update(fichaje)
        db.commit()
        db.refresh(fichaje)
        db.close()

        uri = f"/fichaje/{fichaje.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(fichaje), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/fichajes")
def obtener_fichajes():
    db = SessionLocal()
    try:
        fichajes = db.query(Fichaje).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(fichajes))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/fichaje/{idFichaje}")
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
    hora_entrada: str, 
    hora_salida: str
):
    db = get_db()  
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first() # Obtener el trabajador por su ID
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first() # Obtener la empresa por su ID

        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        elif not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

        horario = Horario(
            id=next_id(Horario),
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipoJornada=tipoJornada,
            dias=dias,
            dias_semana=dias_semana,
            hora_entrada=datetime.strptime(hora_entrada, "%H"),
            hora_salida=datetime.strptime(hora_salida, "%H"),
            trabajador=trabajador, 
            empresa=empresa 
        )
        db.add(horario)
        db.commit()
        db.refresh(horario)
        db.close()

        uri = f"/horario/{horario.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(horario), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horarios")
def obtener_horarios():
    db = SessionLocal()
    try:
        horarios = db.query(Horario).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(horarios))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horarios/trabajador/{idTrabajador}/empresa/{idEmpresa}")
def obtener_horarios_por_trabajador_y_empresa(idTrabajador: int, idEmpresa: int):
    db = SessionLocal()
    try:
        horarios = db.query(Horario).filter(Horario.idTrabajador == idTrabajador, Horario.idEmpresa == idEmpresa).all()
        headers = {"Trabajador": idTrabajador, "Empresa": idEmpresa}
        return JSONResponse(status_code=201, content=jsonable_encoder(horarios), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horario/{idHorario}")
def obtener_horario(idHorario: int):
    db = SessionLocal()
    try:
        horario = db.query(Horario).filter(Horario.id == idHorario).first()
        if horario is None:
            return JSONResponse(status_code=404, content=f"Horario ({idHorario}) no encontrado.")

        return JSONResponse(status_code=201, content=jsonable_encoder(horario)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

#################### RUTAS PARA TRABAJADORES ####################
@app.post("/trabajador")
def crear_trabajador(nombre: str, apellidos: str, dni: str, direccion: str, codigo_postal: str, poblacion: str, provincia: str, cuenta_cotizacion: str, email: str, password: str):
    db = get_db()
    try:
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
            cuenta_cotizacion=cuenta_cotizacion,
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

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador), headers=headers)
    
    except IntegrityError:

        db.rollback()  # Deshacer el intento de inserción fallido
        return JSONResponse(status_code=400, content={"message":f"El trabajador con DNI {dni} ya está registrado."})

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/trabajador/{idTrabajador}/empresas/{idEmpresa}")
def agregar_empresa_a_trabajador(idTrabajador: int, idEmpresa: int):    
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        if empresa not in trabajador.empresas:
            trabajador.empresas.append(empresa)
        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.put("/trabajador/{idTrabajador}/horarios/{idHorario}")
def agregar_horario_a_trabajador(idTrabajador: int, idHorario: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        horario = db.query(Horario).filter(Horario.id == idHorario).first()
        if not horario:
            return JSONResponse(status_code=404, content=f"Horario del trabajador ({idHorario}) no encontrado.")
        if horario not in trabajador.horarios:
            trabajador.horarios.append(horario)
        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.put("/trabajador/{idTrabajador}/fichajes/{idFichaje}")
def agregar_fichaje_a_trabajador(idTrabajador: int, idFichaje: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje).first()
        if not fichaje:
            return JSONResponse(status_code=404, content=f"Fichaje ({idFichaje}) no encontrado.")
        if fichaje not in trabajador.fichajes:
            trabajador.fichajes.append(fichaje)
        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajadores")
def obtener_trabajadores():
    db = SessionLocal()
    try:
        trabajadores = db.query(Trabajador).all()
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajadores)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajadores/empresa/{idEmpresa}")
def obtener_trabajadores_empresa(idEmpresa: int):
    db = SessionLocal()
    try:
        trabajadores = db.query(Trabajador).filter(Trabajador.idEmpresa == idEmpresa).first()
        headers = {"Empresa": idEmpresa}
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajadores), headers=headers) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajadores/{idTrabajador}")
def obtener_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    
        if trabajador is None:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

##################### RUTAS PARA EMPRESAS ####################
@app.post("/empresa")
def crear_empresa(nombre: str, cif: str, direccion: str, codigo_postal: str, poblacion: str, provincia: str):
    db = get_db()
    try:
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
        # db.close()

        uri = f"/empresa/{empresa.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(empresa), headers=headers)

    except IntegrityError:

        db.rollback()  # Deshacer el intento de inserción fallido
        return JSONResponse(status_code=400, content={"message":f"La empresa con CIF {cif} ya está registrada."})

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.delete("/empresa/{idEmpresa}")
def eliminar_empresa(idEmpresa: int):
    db = get_db()
    try:
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        db.delete(empresa)
        db.commit()
    
        return JSONResponse(status_code=200, content=f"Empresa ({idEmpresa}) eliminada correctamente.");
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}");
    
    finally:
        db.close()

@app.put("/empresa/{idEmpresa}/trabajadores/{idTrabajador}")
def agregar_trabajador_a_empresa(idEmpresa: int, idTrabajador: int):
    db = get_db()
    try:
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        if trabajador not in empresa.trabajadores:
            empresa.trabajadores.append(trabajador)
        db.commit()
        db.refresh(empresa)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(empresa))
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/empresas")
def obtener_empresas():
    db = get_db()
    try: 
        empresas = db.query(Empresa).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(empresas))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/empresas/trabajador/{idTrabajador}")
def obtener_empresas_trabajador(idTrabajador: int):
    db = get_db()
    try: 
        empresas = db.query(Empresa).filter(Empresa.idTrabajador == idTrabajador).first()
        headers = {"Trabajador": idTrabajador}
        return JSONResponse(status_code=201, content=jsonable_encoder(empresas), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/empresa/{idEmpresa}")
def obtener_empresa(idEmpresa: int):
    db = get_db()
    try: 
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        return JSONResponse(status_code=201, content=jsonable_encoder(empresa))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()