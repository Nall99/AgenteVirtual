from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
from typing import Literal
import os

load_dotenv() 

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Provedor de LLM (qualquer API compatível com o formato OPENAI)
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "")
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_reasoning_effort: Literal["minimal", "low", "medium", "high"] | None = "low"

    # CORS: origem do seu Angular
    allowed_origin: str = os.getenv("ALLOWED_ORIGIN", "http://localhost:4200")

    # Limites (protegem sua cota gratuita)
    max_history: int = 20
    max_tokens: int = 2500

settings = Settings()