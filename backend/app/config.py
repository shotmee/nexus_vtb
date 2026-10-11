from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://nexus:nexus@localhost:5432/nexus"
    persist_state: bool = True  # сохранять фейковый банк в PostgreSQL; без базы всё равно работает в памяти
    content_dir: Path = Path(__file__).resolve().parents[2] / "content"
    llm_provider: str = "none"  # none | ollama | gigachat
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b-instruct"
    gigachat_credentials: str = ""  # ключ авторизации из личного кабинета GigaChat API
    gigachat_scope: str = "GIGACHAT_API_PERS"
    gigachat_model: str = "GigaChat"
    gigachat_ca_bundle: str = ""  # путь к сертификату Минцифры, если его нет в системе


settings = Settings()
