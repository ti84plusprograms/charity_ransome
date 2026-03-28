#!/usr/bin/env bash
# detect_language.sh — Detects the primary language/tooling in the repo and
# writes GitHub Actions output variables: `language` and `has_tests`.
#
# Outputs
#   language  = python | node | none
#   has_tests = true | false

set -euo pipefail

LANGUAGE="none"
HAS_TESTS="false"

echo "=== Language / Tooling Detection ==="

# ── Python ────────────────────────────────────────────────────────────────────
PYTHON_INDICATORS=0
[ -f "requirements.txt" ]  && PYTHON_INDICATORS=$((PYTHON_INDICATORS + 1))
[ -f "pyproject.toml" ]    && PYTHON_INDICATORS=$((PYTHON_INDICATORS + 1))
[ -f "setup.py" ]          && PYTHON_INDICATORS=$((PYTHON_INDICATORS + 1))
[ -f "setup.cfg" ]         && PYTHON_INDICATORS=$((PYTHON_INDICATORS + 1))
PY_FILES=$(find . -name "*.py" -not -path "./.git/*" 2>/dev/null | wc -l)
[ "$PY_FILES" -gt 0 ] && PYTHON_INDICATORS=$((PYTHON_INDICATORS + 1))

if [ "$PYTHON_INDICATORS" -gt 0 ]; then
    LANGUAGE="python"
    echo "  Detected: Python (indicators=$PYTHON_INDICATORS, .py files=$PY_FILES)"
fi

# ── Node.js ───────────────────────────────────────────────────────────────────
# Note: Node.js is checked after Python so that package.json in a Python
# project (e.g. for front-end assets) does not override Python detection.
# If both are present, Node.js takes precedence.  Add more nuanced handling
# here if a mixed-language project is added in the future.
if [ -f "package.json" ]; then
    LANGUAGE="node"
    echo "  Detected: Node.js (package.json present)"
fi

# ── Tests ─────────────────────────────────────────────────────────────────────
if [ "$LANGUAGE" = "python" ]; then
    if [ -d "tests" ] || [ -d "test" ] \
       || find . -name "test_*.py" -not -path "./.git/*" 2>/dev/null | grep -q . \
       || find . -name "*_test.py" -not -path "./.git/*" 2>/dev/null | grep -q .; then
        HAS_TESTS="true"
        echo "  Detected: Python test files"
    fi
elif [ "$LANGUAGE" = "node" ]; then
    if [ -d "tests" ] || [ -d "test" ] || [ -d "__tests__" ] || [ -d "spec" ]; then
        HAS_TESTS="true"
        echo "  Detected: Node test directory"
    fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [ "$LANGUAGE" = "none" ]; then
    echo "  No recognized language/tooling detected — language-agnostic smoke test will run."
fi
echo "  language=$LANGUAGE  has_tests=$HAS_TESTS"
echo ""

# Write to GitHub Actions step output
{
    echo "language=$LANGUAGE"
    echo "has_tests=$HAS_TESTS"
} >> "${GITHUB_OUTPUT:-/dev/null}"
