import logging
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import RateLimitError
from pydantic import BaseModel, Field, model_validator

from . import llm
from .config import settings
from .prompts import PROMPTS

logger = logging.getLogger("tutor")

app = FastAPI(title="Tutor de Medicina")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


MAX_USER_CHARS = 4000  # o que o aluno digita
MAX_ANY_CHARS = 20000  # respostas do tutor (voltam no histórico e podem ser longas)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_ANY_CHARS)

    @model_validator(mode="after")
    def limit_user_size(self):
        if self.role == "user" and len(self.content) > MAX_USER_CHARS:
            raise ValueError(f"Mensagem muito longa (máximo {MAX_USER_CHARS} caracteres)")
        return self


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1)
    mode: Literal["explicar", "praticar"] = "explicar"


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    history = [m.model_dump() for m in req.messages][-settings.max_history :]

    try:
        reply = await llm.chat(PROMPTS[req.mode], history)
    except RateLimitError:
        logger.warning("Cota do provedor de LLM esgotada")
        raise HTTPException(status_code=429, detail="Limite de uso do tutor atingido")
    except Exception:
        logger.exception("Falha ao chamar o LLM")
        raise HTTPException(status_code=502, detail="Erro ao consultar o modelo")

    return ChatResponse(reply=reply)