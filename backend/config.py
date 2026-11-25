from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # El .env está en la raíz del repo: main.py lo carga con load_dotenv(), que lo busca hacia arriba.
    # env_file solo sirve si alguien corre el backend con un .env propio en backend/.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret_key: str  # RNF-02: sin valor por defecto
    jwt_expire_minutes: int = 30
    cors_origin: str = "http://localhost:5174"  # RNF-05


@lru_cache
def get_settings() -> Settings:
    return Settings()  # falla al iniciar si falta JWT_SECRET_KEY: mejor que firmar con una clave vacía
