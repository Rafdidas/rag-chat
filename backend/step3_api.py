from fastapi import FastAPI
from pydantic import BaseModel

from step2_ask_ai import ask_ai

app = FastAPI()

class AskBody(BaseModel):
  question: str

@app.post("/ask")
def ask(body: AskBody):
  answer = ask_ai(body.question)
  return {"answer": answer}