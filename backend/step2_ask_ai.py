import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def ask_ai(quesion: str) -> str:
  """
  질문을 받아서 AI 답변 문자열을 반환
  """
  res = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
      {"role": "user", "content": quesion}
    ],
    temperature=0.2 # 답변이 너무 튀지 않게 고정
  )
  return res.choices[0].message.content or ""
if __name__ == "__main__":
  answer = ask_ai("AI 개발을 시작하는 사람에게 한 문장 조언을 해줘.")
  print(answer)