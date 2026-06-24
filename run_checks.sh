#!/bin/bash
# run_checks.sh
# Validation script for code checks before git push

export PYTHONPATH=.

echo "🔍 Running code quality checks..."

# Check if src folder exists
if [ ! -d "src" ]; then
    echo "ℹ️ No 'src' folder found yet. Skipping python code checks."
    exit 0
fi

# Run pylint
echo "1. Running pylint on src/..."
if [ -f ".venv/bin/pylint" ]; then
    .venv/bin/pylint src/
else
    pylint src/
fi
PYLINT_EXIT=$?

# Run pytest with code coverage (runs both unit and BDD tests)
echo "2. Running pytest with coverage..."
if /usr/bin/python3 -c "import sqlite3" &>/dev/null; then
    /usr/bin/python3 -m pytest --cov=src --cov-fail-under=90
else
    pytest --cov=src --cov-fail-under=90
fi
PYTEST_EXIT=$?

# Check statuses
if [ $PYLINT_EXIT -ne 0 ]; then
    echo "❌ pylint checks failed!"
    exit 1
fi

if [ $PYTEST_EXIT -ne 0 ]; then
    echo "❌ pytest tests failed!"
    exit 1
fi

echo "✅ All checks passed successfully!"
exit 0
