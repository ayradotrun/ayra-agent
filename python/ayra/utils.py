"""Shared utilities — atomic_replace (trimmed)."""

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
