#!/usr/bin/env python3
"""
Sync repo-root ``agent/``, ``cron/``, and ``skills/`` into ``python/ayra/``.

No external clone — sources live in this repository only.

Usage (from repo root):
  python scripts/sync-ayra-python.py
  npm run sync:python
"""

from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "python" / "ayra"
SKILLS_DEST = DEST / "skills" / "bundles"

# Order matters: longer / specific tokens first
REPLACEMENTS: list[tuple[str, str]] = [
    ("get_hermes_home", "get_ayra_home"),
    ("get_config_path", "get_ayra_config_path"),
    ("hermes_constants", "ayra_constants"),
    ("hermes_time", "ayra_time"),
    ("hermes_cli", "ayra_cli"),
    ("HERMES_MACHINE_ID", "AYRA_MACHINE_ID"),
    ("HERMES_HOME", "AYRA_HOME"),
    ("HERMES_TIMEZONE", "AYRA_TIMEZONE"),
    ("HERMES_DIR", "AYRA_DIR"),
    ("_hermes_now", "_ayra_now"),
    ("hermes://", "ayra://"),
    ("~/.hermes/", "~/.ayra/"),
    ("~/.hermes", "~/.ayra"),
    ("/.hermes/", "/.ayra/"),
    ("Hermes Agent", "AYRA Agent"),
    ("Hermes", "AYRA"),
    ("hermes-agent", "ayra-agent"),
    ('/"hermes"', '/"ayra"'),
    ("/hermes", "/ayra"),
    ("hermes", "ayra"),
]

# Repo-root paths → python/ayra/
PYTHON_COPY_MAP: list[tuple[str, str]] = [
    ("cron/__init__.py", "cron/__init__.py"),
    ("cron/blueprint_catalog.py", "cron/blueprint_catalog.py"),
    ("cron/suggestion_catalog.py", "cron/suggestion_catalog.py"),
    ("cron/suggestions.py", "cron/suggestions.py"),
    ("cron/jobs.py", "cron/jobs.py"),
    ("cron/scheduler_provider.py", "cron/scheduler_provider.py"),
    ("cron/scripts/classify_items.py", "cron/scripts/classify_items.py"),
    ("agent/retry_utils.py", "agent/retry_utils.py"),
    ("agent/iteration_budget.py", "agent/iteration_budget.py"),
    ("agent/async_utils.py", "agent/async_utils.py"),
    ("agent/turn_retry_state.py", "agent/turn_retry_state.py"),
    ("agent/error_classifier.py", "agent/error_classifier.py"),
    ("agent/tool_guardrails.py", "agent/tool_guardrails.py"),
    ("agent/tool_result_classification.py", "agent/tool_result_classification.py"),
    ("agent/skill_bundles.py", "agent/skill_bundles.py"),
    ("agent/skill_utils.py", "agent/skill_utils.py"),
]

AYRA_CONSTANTS = '''"""Minimal AYRA home paths — adapted from hermes_constants.py."""

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
'''

AYRA_UTILS = '''"""Shared utilities — atomic_replace (trimmed)."""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Union


def atomic_replace(tmp_path: Union[str, Path], target: Union[str, Path]) -> str:
    target_str = str(target)
    real_path = os.path.realpath(target_str) if os.path.islink(target_str) else target_str
    tmp_str = str(tmp_path)
    try:
        os.replace(tmp_str, real_path)
    except OSError as exc:
        if exc.errno not in (18, 16, 26):  # EXDEV, EBUSY, ETXTBSY
            raise
        shutil.copy2(tmp_str, real_path)
        os.unlink(tmp_str)
    return real_path
'''

PACKAGE_INIT = '''"""AYRA Python modules."""

__version__ = "0.1.0"
'''

CRON_INIT = '''"""AYRA cron scheduling (Python). TypeScript runtime uses src/lib/cron/."""

from ayra.cron.blueprint_catalog import (  # noqa: F401
    CATALOG,
    get_blueprint,
    fill_blueprint,
    blueprint_catalog_entry,
)
from ayra.cron.suggestion_catalog import CATALOG as SUGGESTION_CATALOG  # noqa: F401
from ayra.cron.scheduler_provider import CronScheduler, InProcessCronScheduler  # noqa: F401
'''

AGENT_INIT = '''"""AYRA agent utilities (Python)."""

from ayra.agent.retry_utils import jittered_backoff  # noqa: F401
from ayra.agent.iteration_budget import IterationBudget  # noqa: F401
from ayra.agent.turn_retry_state import TurnRetryState  # noqa: F401
from ayra.agent.error_classifier import classify_api_error, FailoverReason  # noqa: F401
'''

SKILLS_BUNDLE_README = """# Skill bundles (AYRA)

Synced from repo-root ``skills/`` via ``npm run sync:python``.

Executable skills in the web app live in ``src/lib/skills/``.

Re-sync: ``python scripts/sync-ayra-python.py``
"""


def transform(content: str) -> str:
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    content = content.replace("NousResearch/ayra-agent", "NousResearch/hermes-agent")
    content = content.replace(
        "github.com/NousResearch/ayra-agent",
        "github.com/NousResearch/hermes-agent",
    )
    return content


def resolve_source(rel: str) -> Path | None:
    candidate = ROOT / rel.replace("/", os.sep)
    return candidate if candidate.exists() else None


def port_file(rel_src: str, rel_dest: str) -> bool:
    src_path = resolve_source(rel_src)
    if src_path is None:
        print(f"  skip missing: {rel_src}")
        return False
    dest_path = DEST / rel_dest.replace("/", os.sep)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    text = src_path.read_text(encoding="utf-8")
    dest_path.write_text(transform(text), encoding="utf-8")
    print(f"  py -> {rel_dest}")
    return True


def port_full_skills_tree() -> bool:
    root_skills = ROOT / "skills"
    if not root_skills.is_dir():
        return False
    dest = SKILLS_DEST / "skills"
    if dest.exists():
        shutil.rmtree(dest)

    def ignore(_dir: str, names: list[str]) -> set[str]:
        return {n for n in names if n in {"__pycache__", ".git", "node_modules"}}

    shutil.copytree(root_skills, dest, ignore=ignore)
    for path in dest.rglob("*"):
        if path.is_file() and path.suffix in {".md", ".py", ".yaml", ".yml", ".txt"}:
            try:
                path.write_text(transform(path.read_text(encoding="utf-8")), encoding="utf-8")
            except UnicodeDecodeError:
                pass
    print(f"  skills -> python/ayra/skills/bundles/skills ({sum(1 for _ in dest.rglob('SKILL.md'))} SKILL.md)")
    return True


def fix_python_imports() -> None:
    ayra_time = DEST / "ayra_time.py"
    if ayra_time.exists():
        t = ayra_time.read_text(encoding="utf-8")
        t = re.sub(
            r"from ayra_cli import managed_scope[\s\S]*?except Exception:\s*pass",
            "# managed_scope overlay removed in AYRA port",
            t,
            count=1,
        )
        t = t.replace(
            "from ayra_constants import get_ayra_config_path",
            "from ayra.ayra_constants import get_ayra_config_path",
        )
        ayra_time.write_text(t, encoding="utf-8")

    for folder in ("cron", "agent"):
        for py in (DEST / folder).rglob("*.py"):
            if py.name == "__init__.py":
                continue
            t = py.read_text(encoding="utf-8")
            t = t.replace("from ayra_time import", "from ayra.ayra_time import")
            t = t.replace("from utils import", "from ayra.utils import")
            t = t.replace("from cron.", "from ayra.cron.")
            t = t.replace("from cron import", "from ayra.cron import")
            t = t.replace("from agent.", "from ayra.agent.")
            t = t.replace("from agent import", "from ayra.agent import")
            t = t.replace("from ayra_constants import", "from ayra.ayra_constants import")
            t = t.replace(
                "sys.path.insert(0, str(Path(__file__).parent.parent))",
                "# sys.path bootstrap removed — use pip install -e python/",
            )
            py.write_text(t, encoding="utf-8")

    classify = DEST / "cron" / "scripts" / "classify_items.py"
    if classify.exists():
        t = classify.read_text(encoding="utf-8")
        t = t.replace(
            "Uses AYRA' auxiliary client",
            "Uses AYRA auxiliary client (optional — wire to your LLM)",
        )
        t = t.replace("from agent.auxiliary_client", "# from ayra.agent.auxiliary_client")
        classify.write_text(t, encoding="utf-8")


def write_manifest(copied_py: list[str], copied_skills: list[str]) -> None:
    manifest = ROOT / "docs" / "ayra-python-sync-manifest.md"
    lines = [
        "# AYRA Python sync manifest",
        "",
        "Auto-generated by `scripts/sync-ayra-python.py`. Re-run `npm run sync:python` after editing repo-root modules.",
        "",
        "## Sources (repo root)",
        "",
        "- `agent/` → `python/ayra/agent/`",
        "- `cron/` → `python/ayra/cron/`",
        "- `skills/` → `python/ayra/skills/bundles/skills/`",
        "",
        "## Python modules synced",
        "",
    ]
    for item in copied_py:
        lines.append(f"- `{item}`")
    lines.extend(["", "## Skill bundles synced", ""])
    for item in copied_skills:
        lines.append(f"- `{item}`")
    manifest.write_text("\n".join(lines), encoding="utf-8")
    print(f"  manifest -> docs/ayra-python-sync-manifest.md")


def main() -> int:
    missing_roots = [name for name in ("agent", "cron", "skills") if not (ROOT / name).is_dir()]
    if missing_roots:
        print(f"Missing repo folders: {', '.join(missing_roots)}")
        print("Expected agent/, cron/, and skills/ at the repository root.")
        return 1

    print("Syncing repo-root agent/cron/skills -> python/ayra ...")
    DEST.mkdir(parents=True, exist_ok=True)
    SKILLS_DEST.mkdir(parents=True, exist_ok=True)

    copied_py: list[str] = []
    for src, dest in PYTHON_COPY_MAP:
        if port_file(src, dest):
            copied_py.append(dest)

    copied_skills: list[str] = []
    if port_full_skills_tree():
        copied_skills.append("skills/ (full tree)")
    else:
        print("  skip skills: no repo-root skills/ directory")

    (DEST / "__init__.py").write_text(PACKAGE_INIT, encoding="utf-8")
    (DEST / "ayra_constants.py").write_text(AYRA_CONSTANTS, encoding="utf-8")
    (DEST / "utils.py").write_text(AYRA_UTILS, encoding="utf-8")
    (DEST / "cron" / "__init__.py").write_text(CRON_INIT, encoding="utf-8")
    (DEST / "agent" / "__init__.py").write_text(AGENT_INIT, encoding="utf-8")
    (SKILLS_DEST / "README.md").write_text(SKILLS_BUNDLE_README, encoding="utf-8")

    fix_python_imports()
    write_manifest(copied_py, copied_skills)

    print("Done. Run: npm run python:setup")
    return 0


if __name__ == "__main__":
    sys.exit(main())
