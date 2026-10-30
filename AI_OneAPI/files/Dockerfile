FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10002 --create-home files \
    && mkdir -p /data/artifacts && chown -R files:files /data
COPY server.py worker.py artifact_store.py ./
USER files
CMD ["python", "-B", "server.py"]
