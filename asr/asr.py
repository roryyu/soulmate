# pip install funasr fastapi uvicorn python-multipart
from funasr import AutoModel
from funasr.utils.postprocess_utils import rich_transcription_postprocess
import uvicorn
from fastapi import FastAPI

model = AutoModel(
    model="iic/SenseVoiceSmall",
    vad_model="fsmn-vad",
    device="cpu",
    disable_update=True,        # ← 加上，跳过版本检查
)
app = FastAPI()

@app.post("/asr")
async def asr(item: dict):
    res = model.generate(input=item["wav"], language="auto", use_itn=True)
    return {"text": rich_transcription_postprocess(res[0]["text"]),
            "raw": res[0]["text"]}  # raw 里带 <|HAPPY|> <|NEUTRAL|> 等情绪标签

uvicorn.run(app, host="0.0.0.0", port=8000)

