# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install required system dependencies for Playwright and Chromium
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    xvfb \
    libxcomposite1 \
    libxdamage1 \
    libatk1.0-0 \
    libasound2 \
    libdbus-1-3 \
    libnspr4 \
    libgbm1 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libnss3 \
    libxrandr2 \
    libdrm2 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt to the working directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Run the crawl4ai-setup command to download the browsers inside the container
RUN crawl4ai-setup

# Copy the rest of the application code
COPY . .

# Start the FastAPI server using Uvicorn
# Render automatically injects the PORT environment variable
CMD ["sh", "-c", "uvicorn src.api_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
