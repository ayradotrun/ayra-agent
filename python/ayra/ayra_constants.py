"""Minimal AYRA home paths — adapted from hermes_constants.py."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def get_ayra_home() -> Path:
    """Return AYRA data home (AYRA_HOME env or platform default)."""
    override = os.environ.get("AYRA_HOME", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "win32":
        local = os.environ.get("LOCALAPPDATA", "").strip()
        base = Path(local) if local else Path.home() / "AppData" / "Local"
        return (base / "ayra").resolve()
    return (Path.home() / ".ayra").resolve()


def get_ayra_config_path() -> Path:
    return get_ayra_home() / "config.yaml"


def get_config_path() -> Path:
    """Alias for legacy imports."""
    return get_ayra_config_path()


def get_cron_dir() -> Path:
    return get_ayra_home() / "cron"


def get_skills_dir() -> Path:
    """Skills tree (repo ``skills/`` or ``AYRA_SKILLS_DIR``)."""
    override = os.environ.get("AYRA_SKILLS_DIR", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    repo = os.environ.get("AYRA_REPO_ROOT", "").strip()
    if repo:
        candidate = Path(repo) / "skills"
        if candidate.is_dir():
            return candidate.resolve()
    bundled = Path(__file__).resolve().parent / "skills" / "bundles" / "skills"
    if bundled.is_dir():
        return bundled
    return get_ayra_home() / "skills"


def is_termux() -> bool:
    return False


def is_wsl() -> bool:
    return False
