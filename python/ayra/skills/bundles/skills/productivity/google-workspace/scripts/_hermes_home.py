"""Resolve AYRA_HOME for standalone skill scripts.

Skill scripts may run outside the AYRA process (e.g. system Python,
nix env, CI) where ``ayra_constants`` is not importable.  This module
provides the same ``get_ayra_home()`` and ``display_ayra_home()``
contracts as ``ayra_constants`` without requiring it on ``sys.path``.

When ``ayra_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``ayra_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``AYRA_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from ayra_constants import display_ayra_home as display_ayra_home
    from ayra_constants import get_ayra_home as get_ayra_home
except (ModuleNotFoundError, ImportError):

    def get_ayra_home() -> Path:
        """Return the AYRA home directory (default: ~/.ayra).

        Mirrors ``ayra_constants.get_ayra_home()``."""
        val = os.environ.get("AYRA_HOME", "").strip()
        return Path(val) if val else Path.home() / ".ayra"

    def display_ayra_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``ayra_constants.display_ayra_home()``."""
        home = get_ayra_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)
