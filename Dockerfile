FROM python:3.13-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and files
COPY src/ src/
COPY data/ data/
COPY application_blueprint/ application_blueprint/
COPY run_checks.sh .
COPY .pylintrc .

ENV PYTHONPATH=/workspace
EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "src.app:create_app()"]
