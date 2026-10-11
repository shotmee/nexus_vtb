FROM python:3.11-slim
WORKDIR /srv
COPY requirements.txt requirements-ocr.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Распознавание скриншотов в Щите (≈1 ГБ): docker compose build --build-arg WITH_OCR=1 backend
ARG WITH_OCR=0
RUN if [ "$WITH_OCR" = "1" ]; then pip install --no-cache-dir -r requirements-ocr.txt \
    && python -c "import easyocr; easyocr.Reader(['ru','en'], gpu=False, verbose=False)"; fi
COPY app ./app
COPY tests ./tests
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
