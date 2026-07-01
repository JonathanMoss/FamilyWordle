#!/usr/bin/env bash
# scripts/migrate_and_backfill.sh
# Bash runner script to upgrade the database schema and back-fill word definitions.

set -e

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

export PYTHONPATH="${PROJECT_DIR}"

echo "🔄 Launching database schema migration and word definition backfill..."

# Check if virtual environment exists and activate it
if [ -d "${PROJECT_DIR}/.venv" ]; then
    echo "💡 Activating local virtual environment..."
    source "${PROJECT_DIR}/.venv/bin/activate"
fi

python3 "${SCRIPT_DIR}/backfill_definitions.py"

echo "✅ Database migration and backfill completed successfully!"
