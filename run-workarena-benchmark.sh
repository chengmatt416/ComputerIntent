#!/bin/bash
set -e

echo "=============================================="
echo " LHIC ServiceNow WorkArena Benchmark Runner   "
echo "=============================================="

# 1. Check Python installation and version
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
if [[ "$PY_VERSION" != "3.11" && "$PY_VERSION" != "3.12" ]]; then
    echo "⚠️ Warning: WorkArena / AgentLab officially supports Python 3.11 or 3.12. Current version: $PY_VERSION"
    echo "Proceeding with caution. If it fails, please use Python 3.11/3.12."
fi

# 2. Check Hugging Face token
if [ -z "$HUGGING_FACE_HUB_TOKEN" ]; then
    echo "🔑 Hugging Face Access Token not found in HUGGING_FACE_HUB_TOKEN env."
    read -r -p "Please paste your Hugging Face Access Token (read permission): " HF_TOKEN
    if [ -z "$HF_TOKEN" ]; then
        echo "❌ Error: Hugging Face Token is required."
        exit 1
    fi
    export HUGGING_FACE_HUB_TOKEN="$HF_TOKEN"
fi

# 3. Create virtual environment
VENV_DIR=".venv-workarena"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

# Activate venv
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# 4. Install dependencies
echo "📥 Installing python packages (browsergym-workarena, agentlab, huggingface_hub)..."
pip install --upgrade pip
pip install browsergym-workarena agentlab huggingface_hub

echo "📥 Installing Playwright browsers..."
playwright install chromium

# 5. Check Hugging Face gated access permission
echo "🔒 Verifying access to ServiceNow/WorkArena-Instances dataset..."
access_check=$(python3 -c "
import os
from huggingface_hub import HfApi
api = HfApi(token=os.environ.get('HUGGING_FACE_HUB_TOKEN'))
try:
    api.dataset_info('ServiceNow/WorkArena-Instances')
    print('GRANTED')
except Exception as e:
    print('DENIED')
    print(e)
")

if [[ "$access_check" == *"GRANTED"* ]]; then
    echo "✅ Success! Access granted to ServiceNow/WorkArena-Instances."
else
    echo "⏳ Access Denied or Pending."
    echo "Please ensure you have submitted approval on: https://huggingface.co/datasets/ServiceNow/WorkArena-Instances"
    echo "and that your HUGGING_FACE_HUB_TOKEN is correct."
    exit 1
fi

# 6. Run readiness check using LHIC CLI
echo "🔍 Running LHIC preflight and readiness check..."
npm run build
npx tsx apps/cli/src/main.ts bench readiness workarena

# 7. Start Benchmark
echo "🚀 Starting WorkArena Benchmark via AgentLab..."
python -m agentlab.experiments.run --agent agentlab.agents.baselines.KeyboardAgent --benchmark workarena --num_tasks 5 --max_steps 15

echo "=============================================="
echo "🎉 Benchmark run finished!"
echo "=============================================="
