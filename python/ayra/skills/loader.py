"""Scan Hermes-style SKILL.md bundles under the skills tree."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from ayra.ayra_constants import get_skills_dir

_FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> Dict[str, str]:
    match = _FRONTMATTER.match(text)
    if not match:
        return {}
    block = match.group(1)
    meta: Dict[str, str] = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta


def _slug_from_path(skill_md: Path, skills_root: Path) -> str:
    rel = skill_md.relative_to(skills_root)
    parts = list(rel.parts[:-1])  # drop SKILL.md
    if parts:
        return parts[-1]
    return skill_md.parent.name


def list_skill_bundles(limit: int = 500) -> List[Dict[str, Any]]:
    root = get_skills_dir()
    if not root.is_dir():
        return []

    entries: List[Dict[str, Any]] = []
    for skill_md in sorted(root.rglob("SKILL.md")):
        if len(entries) >= limit:
            break
        try:
            text = skill_md.read_text(encoding="utf-8")
        except OSError:
            continue
        fm = _parse_frontmatter(text)
        slug = fm.get("name") or _slug_from_path(skill_md, root)
        body = _FRONTMATTER.sub("", text, count=1).strip()
        rel = str(skill_md.relative_to(root)).replace("\\", "/")
        entries.append(
            {
                "slug": slug,
                "name": fm.get("name") or slug,
                "description": fm.get("description", ""),
                "version": fm.get("version", ""),
                "path": rel,
                "category": skill_md.relative_to(root).parts[0] if skill_md.relative_to(root).parts else "",
                "preview": body[:400],
            }
        )
    return entries


def get_skill_bundle(slug: str) -> Optional[Dict[str, Any]]:
    slug = slug.strip().lower()
    for entry in list_skill_bundles():
        if entry["slug"].lower() == slug:
            root = get_skills_dir()
            skill_path = root / entry["path"]
            try:
                content = skill_path.read_text(encoding="utf-8")
            except OSError:
                return None
            body = _FRONTMATTER.sub("", content, count=1).strip()
            return {**entry, "content": body[:12000]}
    return None
