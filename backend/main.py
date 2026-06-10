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
def crear_fichaje(
    idTrabajador: int, 
    idEmpresa: int, 
    tipo: str
):
    db = get_db() 
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrada.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

        fichaje = Fichaje(
            id=next_id(Fichaje), 
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipo=tipo,
            fecha= datetime.now(),
            fecha_hora=datetime.now(), 
            trabajador=trabajador,
            empresa=empresa 
        )
        db.add(fichaje)
        # agregar_fichaje_a_trabajador(idTrabajador, fichaje.id)

        db.commit()
        db.refresh(fichaje)

        uri = f"/fichaje/{fichaje.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(fichaje), headers=headers)

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/fichaje/{idFichaje}")
def editar_fichaje(
    idFichaje: int, 
    idTrabajador: int, 
    idEmpresa: int, 
    tipo: str, 
    fecha_hora: str
):
    db = get_db() 
    try:
        # fecha_hora = datetime.strptime(fecha_hora, "%Y-%m-%d %H:%M:%S")

        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        
        fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje, Fichaje.idTrabajador == idTrabajador, Fichaje.idEmpresa == idEmpresa, Fichaje.tipo == tipo, Fichaje.fecha_hora == fecha_hora)
        if not fichaje:
            return JSONResponse(status_code=404, content=f"Fichaje {idFichaje} no encontrado.")

        fichaje = Fichaje(
            idFichaje=idFichaje, 
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipo=tipo,
            fecha_hora=fecha_hora
        )

        db.query(Fichaje).filter(Fichaje.id == idFichaje).update(fichaje)
        db.commit()
        db.refresh(fichaje)

        return JSONResponse(status_code=201, content=jsonable_encoder(fichaje))

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.delete("/fichaje/{idFichaje}")
def eliminar_fichaje(idFichaje: int):
    db = get_db()
    try:
        fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje).first()
        if not fichaje:
            return JSONResponse(status_code=404, content=f"Fichaje ({idFichaje}) no encontrado.")
        
        db.delete(fichaje)
        db.commit()
    
        return JSONResponse(status_code=200, content=f"Fichaje ({idFichaje}) eliminado correctamente.")
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/fichajes")
def obtener_fichajes():
    db = get_db()
    try:
        fichajes = db.query(Fichaje).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(fichajes))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/fichajes/trabajador/{idTrabajador}/empresa/{idEmpresa}")
def obtener_fichajes_trabajador_empresa(idTrabajador: int, idEmpresa: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

        fichajes = db.query(Fichaje).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(fichajes))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/fichaje/{idFichaje}")
def obtener_fichaje(idFichaje: int):
    db = get_db()
    try:
        fichaje = db.query(Fichaje).filter(Fichaje.id == idFichaje).first()
        if not fichaje:
            return JSONResponse(status_code=404, content=f"Fichaje ({idFichaje}) no encontrado.")
        
        return JSONResponse(status_code=201, content=jsonable_encoder(fichaje))
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

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
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
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
        # agregar_horario_a_trabajador(idTrabajador, horario.id)
        db.add(horario)
        db.commit()
        db.refresh(horario)

        uri = f"/horario/{horario.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(horario), headers=headers)

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/horario/{idHorario}")
def editar_horario(
    idHorario: int, 
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
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        
        horario = db.query(Horario).filter(Horario.id == idHorario, Horario.idTrabajador == idTrabajador, Horario.idEmpresa == idEmpresa)
        if not horario:
            return JSONResponse(status_code=404, content=f"Horario {idHorario} no encontrado.")

        horario = Horario(
            idHorario=idHorario, 
            idTrabajador=idTrabajador,
            idEmpresa=idEmpresa,
            tipoJornada=tipoJornada,
            dias=dias,
            diasSemana=dias_semana,
            hora_entrada=hora_entrada,
            hora_salida=hora_salida
        )

        db.query(Horario).filter(Horario.id == idHorario).update(horario)
        db.commit()
        db.refresh(horario)

        return JSONResponse(status_code=201, content=jsonable_encoder(horario))

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.delete("/horario/{idHorario}")
def eliminar_horario(idHorario: int):
    db = get_db()
    try:
        horario = db.query(Horario).filter(Horario.id == idHorario).first()
        if not horario:
            return JSONResponse(status_code=404, content=f"Horario ({idHorario}) no encontrado.")
        
        db.delete(horario)
        db.commit()
    
        return JSONResponse(status_code=200, content=f"Horario ({idHorario}) eliminado correctamente.")
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horarios")
def obtener_horarios():
    db = get_db()
    try:
        horarios = db.query(Horario).all()
        return JSONResponse(status_code=201, content=jsonable_encoder(horarios))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horarios/trabajador/{idTrabajador}/empresa/{idEmpresa}")
def obtener_horario_trabajador_y_empresa(idTrabajador: int, idEmpresa: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=400, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=400, content=f"Empresa ({idEmpresa}) no encontrada.")

        horarios = db.query(Horario).filter(Horario.idTrabajador == idTrabajador, Horario.idEmpresa == idEmpresa).all()

        headers = {"Trabajador": idTrabajador.__str__(), "Empresa": idEmpresa.__str__()}

        return JSONResponse(status_code=201, content=jsonable_encoder(horarios), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/horario/{idHorario}")
def obtener_horario(idHorario: int):
    db = get_db()
    try:
        horario = db.query(Horario).filter(Horario.id == idHorario).first()
        if not horario:
            return JSONResponse(status_code=404, content=f"Horario ({idHorario}) no encontrado.")

        return JSONResponse(status_code=201, content=jsonable_encoder(horario)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

#################### RUTAS PARA TRABAJADORES ####################
@app.post("/trabajador")
def crear_trabajador(
    nombre: str, 
    apellidos: str, 
    dni: str, 
    role: str,
    estado: str,
    direccion: str, 
    codigo_postal: str, 
    poblacion: str, 
    provincia: str, 
    cuenta_cotizacion: str, 
    puesto: str,
    email: str, 
    password: str
):
    db = get_db()
    try:
        existeTrabajador = db.query(Trabajador).filter(Trabajador.dni == dni).first()
        if existeTrabajador:
            return JSONResponse(status_code=404, content=f"Ya existe un trabajador con dni ({dni}).")

        trabajador = Trabajador(
            id=next_id(Trabajador),
            nombre=nombre,
            apellidos=apellidos,
            dni=dni,
            role=role,
            estado=estado,
            direccion=direccion,
            codigo_postal=codigo_postal,
            poblacion=poblacion,
            provincia=provincia,
            cuenta_cotizacion=cuenta_cotizacion,
            puesto=puesto,
            email=email,
            password=password,
            fichajes=[],  
            horarios=[],
            empresas=[] 
        )
        # for empresa in trabajador.empresas:
        #     agregar_trabajador_a_empresa(empresa.id, trabajador.id)
        db.add(trabajador)
        db.commit()
        db.refresh(trabajador)

        uri = f"/trabajador/{trabajador.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador), headers=headers)

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/trabajador/{idTrabajador}")
def editar_trabajador(
    idTrabajador: int, 
    nombre: str, 
    apellidos: str, 
    dni: str, 
    direccion: str, 
    codigo_postal: str, 
    poblacion: str, 
    provincia: str, 
    cuenta_cotizacion: str, 
    email: str, 
    password: str
):
    db = get_db() 
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")

        trabajador = Trabajador(
            idTrabajador=idTrabajador, 
            nombre=nombre,
            apellidos=apellidos,
            dni=dni,
            direccion=direccion,
            codigo_postal=codigo_postal,
            poblacion=poblacion,
            provincia=provincia,
            cuenta_cotizacion=cuenta_cotizacion,
            email=email,
            password=password
        )

        db.query(Trabajador).filter(Trabajador.id == idTrabajador).update(trabajador)
        db.commit()
        db.refresh(trabajador)

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador))

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()
    
@app.put("/trabajador/{dni}")
def editar_trabajador_dni(
    nombre: str, 
    apellidos: str, 
    dni: str, 
    direccion: str, 
    codigo_postal: str, 
    poblacion: str, 
    provincia: str, 
    cuenta_cotizacion: str, 
    email: str, 
    password: str
):
    db = get_db() 
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.dni == dni).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({dni}) no encontrado.")

        trabajador = Trabajador(
            nombre=nombre,
            apellidos=apellidos,
            dni=dni,
            direccion=direccion,
            codigo_postal=codigo_postal,
            poblacion=poblacion,
            provincia=provincia,
            cuenta_cotizacion=cuenta_cotizacion,
            email=email,
            password=password
        )

        db.query(Trabajador).filter(Trabajador.dni == dni).update(trabajador)
        db.commit()
        db.refresh(trabajador)

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador))

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.delete("/trabajador/{idTrabajador}")
def eliminar_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        db.delete(trabajador)
        db.commit()
    
        return JSONResponse(status_code=200, content=f"Trabajador ({idTrabajador}) eliminado correctamente.")
    
    except OSError as error:
        db.rollback()
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
        else:
            return JSONResponse(status_code=404, content=f"El empresa ({empresa.id}) ya existe en la lista de empresas del trabajador {trabajador.nombre} {trabajador.apellidos}.")

        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.delete("/trabajador/{idTrabajador}/empresas/{idEmpresa}")
def eliminar_empresa_a_trabajador(idTrabajador: int, idEmpresa: int):    
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        
        if empresa not in trabajador.empresas:
            trabajador.empresas.remove(empresa)
        else:
            return JSONResponse(status_code=404, content=f"El empresa ({empresa.id}) ya existe en la lista de empresas del trabajador {trabajador.nombre} {trabajador.apellidos}.")

        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        db.rollback()
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
        else:
            return JSONResponse(status_code=404, content=f"El horario ({horario.id}) ya existe en la lista de horarios del trabajador {trabajador.nombre} {trabajador.apellidos}.")

        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 

    except OSError as error:
        db.rollback()
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
        else:
            return JSONResponse(status_code=404, content=f"El fichaje ({fichaje.id}) ya existe en la lista de fichajes del trabajador {trabajador.nombre} {trabajador.apellidos}.")

        db.commit()
        db.refresh(trabajador)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajadores")
def obtener_trabajadores():
    db = get_db()
    try:
        trabajadores = db.query(Trabajador).all()
    
        return JSONResponse(status_code=201, content=jsonable_encoder(trabajadores)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajador/{idTrabajador}/empresas")
def obtener_empresas_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador =  db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        empresas = trabajador.empresas

        headers = {"Trabajador": idTrabajador.__str__()}

        return JSONResponse(status_code=201, content=jsonable_encoder(empresas), headers=headers)
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/trabajador/{idTrabajador}/fichajes")
def obtener_fichajes_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador =  db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        fichajes = trabajador.fichajes

        headers = {"Trabajador": idTrabajador.__str__()}

        return JSONResponse(status_code=201, content=jsonable_encoder(fichajes), headers=headers)
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/trabajador/{idTrabajador}/horarios")
def obtener_horarios_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador =  db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")
        
        horarios = trabajador.horarios

        headers = {"Trabajador": idTrabajador.__str__()}

        return JSONResponse(status_code=201, content=jsonable_encoder(horarios), headers=headers)
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/trabajador/{idTrabajador}")
def obtener_trabajador(idTrabajador: int):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.id == idTrabajador).first()
    
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({idTrabajador}) no encontrado.")

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

@app.get("/trabajador/{email}/{password}")
def obtener_trabajador_email_password(email: str, password: str):
    db = get_db()
    try:
        trabajador = db.query(Trabajador).filter(Trabajador.email == email, Trabajador.password == password).first()
    
        if not trabajador:
            return JSONResponse(status_code=404, content=f"Trabajador ({email}) no encontrado.")

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajador)) 
    
    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")

    finally:
        db.close()

##################### RUTAS PARA EMPRESAS ####################
@app.post("/empresa")
def crear_empresa(
    nombre: str, 
    cif: str, 
    direccion: str, 
    codigo_postal: str, 
    poblacion: str, 
    provincia: str
):
    db = get_db()
    try:
        empresa = db.query(Empresa).filter(Empresa.cif == cif).first()
        if empresa:
            return JSONResponse(status_code=404, content=f"Ya existe una empresa con CIF ({cif}).")

        empresa = Empresa(
            id=next_id(Empresa),
            nombre=nombre,
            cif=cif,
            direccion=direccion,
            codigo_postal=codigo_postal,
            poblacion=poblacion,
            provincia=provincia,
            trabajadores=[]
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)

        uri = f"/empresa/{empresa.id}"
        headers = {"Location": uri}

        return JSONResponse(status_code=201, content=jsonable_encoder(empresa), headers=headers)

    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.put("/empresa/{idEmpresa}")
def editar_empresa(
    idEmpresa: int, 
    nombre: str, 
    cif: str, 
    direccion: str, 
    codigo_postal: str, 
    poblacion: str, 
    provincia: str
):
    db = get_db() 
    try:
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa:
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")

        empresa = Empresa(
            idEmpresa=idEmpresa, 
            nombre=nombre,
            cif=cif,
            direccion=direccion,
            codigo_postal=codigo_postal,
            poblacion=poblacion,
            provincia=provincia
        )

        db.query(Empresa).filter(Empresa.id == idEmpresa).update(empresa)
        db.commit()
        db.refresh(empresa)

        return JSONResponse(status_code=201, content=jsonable_encoder(empresa))

    except OSError as error:
        db.rollback()
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
    
        return JSONResponse(status_code=200, content=f"Empresa ({idEmpresa}) eliminada correctamente.")
    
    except OSError as error:
        db.rollback()
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
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
        else:
            return JSONResponse(status_code=404, content=f"El trabajador {trabajador.nombre} {trabajador.apellidos} ({trabajador.dni}) ya está en la empresa {empresa.nombre}.")

        db.commit()
        db.refresh(empresa)
    
        return JSONResponse(status_code=201, content=jsonable_encoder(empresa))
    
    except OSError as error:
        db.rollback()
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

@app.get("/empresa/{idEmpresa}/trabajadores")
def obtener_trabajadores_empresa(idEmpresa: int):
    db = get_db()
    try: 
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()
        if not empresa: 
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        
        trabajadores = empresa.trabajadores

        headers = {"Empresa": idEmpresa.__str__()}

        return JSONResponse(status_code=201, content=jsonable_encoder(trabajadores), headers=headers)

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()

@app.get("/empresa/{idEmpresa}")
def obtener_empresa(idEmpresa: int):
    db = get_db()
    try: 
        empresa = db.query(Empresa).filter(Empresa.id == idEmpresa).first()

        if not empresa: 
            return JSONResponse(status_code=404, content=f"Empresa ({idEmpresa}) no encontrada.")
        
        return JSONResponse(status_code=201, content=jsonable_encoder(empresa))

    except OSError as error:
        return JSONResponse(status_code=400, content=f"Ha ocurrido un error: {error}")
    
    finally:
        db.close()