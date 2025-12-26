import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

res = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "user", "content": "파이썬에서 OpenAI API 호출 테스트입니다. 1문장으로 답해주세요."}
    ],
)

print(res.choices[0].message.content)
