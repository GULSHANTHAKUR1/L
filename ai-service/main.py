"""
Top-level entry point for HETEROHMS OCR Microservice.
Allows running with either:
  1. `python main.py`
  2. `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
"""
import uvicorn
from app.config import settings
from app.main import app

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
