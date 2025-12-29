import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI()


class AskBody(BaseModel):
    question: str


def stream_ai_answer(question: str):
    """
    OpenAI 스트리밍 응답을 그대로 yield
    """
    stream = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": question}],
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


@app.post("/ask/stream")
def ask_stream(body: AskBody):
    return StreamingResponse(
        stream_ai_answer(body.question),
        media_type="text/plain",
    )
