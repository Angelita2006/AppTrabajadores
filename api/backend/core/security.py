import bcrypt

def get_password_hash(password: str) -> str:
    """
    Toma una contraseña en texto plano, la convierte a bytes,
    genera un salt automático y devuelve el hash encriptado como string.
    """
    # 1. Convertimos la contraseña string a bytes (UTF-8)
    password_bytes = password.encode('utf-8')
    
    # 2. Generamos el salt aleatorio seguro
    salt = bcrypt.gensalt()
    
    # 3. Hasheamos la clave
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    
    # 4. Lo decodificamos a string para poder almacenarlo en la columna VARCHAR de PostgreSQL
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compara la contraseña en texto plano del login contra el hash de la base de datos.
    Devuelve True si coinciden, manejando correctamente la conversión de tipos.
    """
    try:
        # Convertimos ambos strings a bytes para que bcrypt pueda realizar la comparación segura
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False
