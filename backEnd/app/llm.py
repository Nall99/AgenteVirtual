from typing import cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from .config import settings

client = AsyncOpenAI(
    api_key=settings.llm_api_key,
    base_url=settings.llm_base_url,
)


async def chat(system: str, messages: list[dict]) -> str:
    """Envia o histórico ao modelo e devolve o texto da resposta."""
    payload = cast(
        list[ChatCompletionMessageParam],
        [{"role": "system", "content": system}, *messages],
    )
    resp = await client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=settings.max_tokens,
        reasoning_effort=settings.llm_reasoning_effort,
        messages=payload,
    )
    return resp.choices[0].message.content or ""