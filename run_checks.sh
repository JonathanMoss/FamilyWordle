#!/bin/bash
# run_checks.sh
# Validation script for code checks before git push

echo "🔍 Running code quality checks..."

# Check if src folder exists
if [ ! -d "src" ]; then
    echo "ℹ️ No 'src' folder found yet. Skipping python code checks."
    exit 0
fi

# Run pylint
echo "1. Running pylint on src/..."
pylint src/
PYLINT_EXIT=$?

# Run pytest (runs both unit and BDD tests)
echo "2. Running pytest..."
pytest
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
