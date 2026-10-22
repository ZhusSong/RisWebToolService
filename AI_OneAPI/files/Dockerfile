FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10002 --create-home files
COPY server.py worker.py ./
USER files
CMD ["python", "-B", "server.py"]
