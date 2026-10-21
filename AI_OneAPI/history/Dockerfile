FROM python:3.12-slim
WORKDIR /app
COPY server.py /app/server.py
RUN useradd --uid 10001 --create-home history && mkdir /data && chown history:history /data
USER history
CMD ["python", "-B", "server.py"]
