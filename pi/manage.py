#!/usr/bin/env python3
"""Reconcile canonical Pi resources with their runtime locations."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Any

MANAGER_VERSION = 1
STATE_RELATIVE_PATH = Path(".local/state/chezmoi/pi-resources.json")
DEPENDENCY_STAMP = ".chezmoi-deps.sha256"
TREE_EXCLUDES = {"node_modules", DEPENDENCY_STAMP}


def lexists(path: Path) -> bool:
    return os.path.lexists(path)


def remove_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink()
    elif path.is_dir():
        shutil.rmtree(path)


def safe_entry_name(name: object) -> bool:
    return (
        isinstance(name, str)
        and name not in {"", ".", ".."}
        and Path(name).name == name
    )


def ensure_safe_runtime_parents(home: Path) -> None:
    directories = [
        home / ".pi/agent",
        home / ".agents",
        (home / STATE_RELATIVE_PATH).parent,
    ]
    for directory in directories:
        current = directory
        while current != home:
            if current.is_symlink():
                raise RuntimeError(f"refusing to traverse symlinked runtime directory: {current}")
            if current.exists() and not current.is_dir():
                raise RuntimeError(f"runtime directory path is not a directory: {current}")
            current = current.parent


def validate_source(source: Path) -> None:
    instruction = source / "AGENTS.md"
    if not instruction.is_file() or instruction.is_symlink():
        raise RuntimeError(f"canonical Pi instructions must be a regular file: {instruction}")
    for root in (source / "agents", source / "skills", source / "extensions"):
        if not root.is_dir() or root.is_symlink():
            raise RuntimeError(f"canonical Pi resource root must be a regular directory: {root}")
        for path in root.rglob("*"):
            if path.is_symlink():
                raise RuntimeError(f"canonical Pi resources must not contain symlinks: {path}")


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def tree_entries(root: Path) -> dict[str, tuple[Any, ...]]:
    if not root.is_dir() or root.is_symlink():
        return {}

    entries: dict[str, tuple[Any, ...]] = {}
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(part in TREE_EXCLUDES for part in relative.parts):
            continue
        key = relative.as_posix()
        if path.is_symlink():
            entries[key] = ("symlink", os.readlink(path))
        elif path.is_dir():
            entries[key] = ("directory",)
        elif path.is_file():
            entries[key] = (
                "file",
                bool(path.stat().st_mode & 0o111),
                file_digest(path),
            )
    return entries


def trees_match(source: Path, target: Path) -> bool:
    if not target.is_dir() or target.is_symlink():
        return False
    return tree_entries(source) == tree_entries(target)


def files_match(source: Path, target: Path) -> bool:
    return (
        target.is_file()
        and not target.is_symlink()
        and bool(source.stat().st_mode & 0o111) == bool(target.stat().st_mode & 0o111)
        and file_digest(source) == file_digest(target)
    )


def load_state(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def desired_names(source: Path) -> list[str]:
    names: list[str] = []
    for path in source.iterdir():
        if path.is_symlink():
            raise RuntimeError(f"canonical Pi resources must not contain symlinks: {path}")
        if path.is_dir() or path.is_file():
            names.append(path.name)
    return sorted(names)


def entries_match(source: Path, target: Path) -> bool:
    if source.is_dir():
        return trees_match(source, target)
    if source.is_file():
        return files_match(source, target)
    return False


def dependency_digest(extension: Path) -> str | None:
    files = [extension / "package.json", extension / "package-lock.json"]
    if not all(path.is_file() for path in files):
        return None
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.name.encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def required_installed_packages(extension: Path) -> list[str]:
    try:
        package = json.loads((extension / "package.json").read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return []
    required: set[str] = set()
    for key in ("dependencies", "optionalDependencies", "devDependencies"):
        dependencies = package.get(key)
        if isinstance(dependencies, dict):
            required.update(name for name in dependencies if isinstance(name, str))
    return sorted(required)


def dependencies_healthy(extension: Path, target: Path) -> bool:
    required = required_installed_packages(extension)
    if not required:
        return True
    modules = target / "node_modules"
    internal_lock = modules / ".package-lock.json"
    if modules.is_symlink() or not modules.is_dir():
        return False
    if internal_lock.is_symlink() or not internal_lock.is_file():
        return False
    for name in required:
        parts = name.split("/")
        if any(not safe_entry_name(part) for part in parts):
            return False
        package_json = modules.joinpath(*parts) / "package.json"
        if package_json.is_symlink() or not package_json.is_file():
            return False
    return True


def resources(home: Path, source: Path) -> list[tuple[str, Path, Path]]:
    return [
        ("agents", source / "agents", home / ".agents/agents"),
        ("skills", source / "skills", home / ".agents/skills"),
        ("extensions", source / "extensions", home / ".pi/agent/extensions"),
    ]


def is_clean(home: Path, source: Path) -> bool:
    try:
        ensure_safe_runtime_parents(home)
    except RuntimeError:
        return False

    state = load_state(home / STATE_RELATIVE_PATH)
    if state.get("version") != MANAGER_VERSION:
        return False

    instruction = source / "AGENTS.md"
    for target in (home / ".pi/agent/AGENTS.md", home / ".agents/AGENTS.md"):
        if not files_match(instruction, target):
            return False

    owned = state.get("owned")
    if not isinstance(owned, dict):
        return False

    for name, source_root, target_root in resources(home, source):
        desired = desired_names(source_root)
        previous = owned.get(name)
        if previous != desired:
            return False
        for entry in desired:
            if not entries_match(source_root / entry, target_root / entry):
                return False

    extension_root = home / ".pi/agent/extensions"
    for extension in (source / "extensions").iterdir():
        if not extension.is_dir():
            continue
        expected = dependency_digest(extension)
        if expected is None:
            continue
        target = extension_root / extension.name
        stamp = target / DEPENDENCY_STAMP
        if stamp.is_symlink() or not stamp.is_file():
            return False
        try:
            actual = stamp.read_text().strip()
        except OSError:
            return False
        if actual != expected:
            return False
        if not dependencies_healthy(extension, target):
            return False

    return True


def write_atomic_text(target: Path, content: str, mode: int = 0o644) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_symlink():
        target.unlink()
    elif lexists(target) and not target.is_file():
        raise RuntimeError(f"refusing to replace non-file state path: {target}")

    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w") as output:
            output.write(content)
        temporary.chmod(mode)
        os.replace(temporary, target)
    finally:
        if lexists(temporary):
            temporary.unlink()


def copy_regular_file(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_symlink() or (lexists(target) and not target.is_file()):
        remove_path(target)
    if files_match(source, target):
        return

    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as output, source.open("rb") as input_file:
            shutil.copyfileobj(input_file, output)
        shutil.copystat(source, temporary)
        os.replace(temporary, target)
    finally:
        if lexists(temporary):
            temporary.unlink()


def sync_tree(source: Path, target: Path) -> None:
    if target.is_symlink() or (lexists(target) and not target.is_dir()):
        remove_path(target)
    target.mkdir(parents=True, exist_ok=True)

    source_entries = tree_entries(source)
    for path in sorted(target.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        relative = path.relative_to(target)
        if any(part in TREE_EXCLUDES for part in relative.parts):
            continue
        if relative.as_posix() not in source_entries:
            remove_path(path)

    for relative, metadata in source_entries.items():
        source_path = source / relative
        target_path = target / relative
        kind = metadata[0]
        if kind == "directory":
            if target_path.is_symlink() or (lexists(target_path) and not target_path.is_dir()):
                remove_path(target_path)
            target_path.mkdir(parents=True, exist_ok=True)
        elif kind == "file":
            copy_regular_file(source_path, target_path)
        else:
            raise RuntimeError(f"canonical Pi resources must not contain symlinks: {source_path}")


def sync_entry(source: Path, target: Path) -> None:
    if source.is_dir():
        sync_tree(source, target)
    elif source.is_file():
        copy_regular_file(source, target)
    else:
        raise RuntimeError(f"unsupported canonical Pi resource: {source}")


def remove_legacy_links(root: Path) -> None:
    if not root.is_dir():
        return
    for path in root.iterdir():
        if not path.is_symlink():
            continue
        destination = os.readlink(path)
        if "/projects/dotfiles/agents/" in destination or "/projects/dotfiles/pi/extensions/" in destination:
            path.unlink()


def install_dependencies(source: Path, home: Path) -> None:
    target_root = home / ".pi/agent/extensions"
    for extension in sorted((source / "extensions").iterdir()):
        if not extension.is_dir():
            continue
        expected = dependency_digest(extension)
        if expected is None:
            continue
        target = target_root / extension.name
        stamp = target / DEPENDENCY_STAMP
        if stamp.is_symlink():
            stamp.unlink()
        try:
            actual = stamp.read_text().strip()
        except OSError:
            actual = ""
        healthy = dependencies_healthy(extension, target)
        if actual == expected and healthy:
            continue
        subprocess.run(
            [
                "npm",
                "--prefix",
                str(target),
                "ci",
                "--omit=peer",
                "--legacy-peer-deps",
            ],
            check=True,
        )
        if not dependencies_healthy(extension, target):
            raise RuntimeError(f"npm did not produce a healthy dependency tree: {target}")
        write_atomic_text(stamp, expected + "\n")


def apply(home: Path, source: Path) -> None:
    ensure_safe_runtime_parents(home)
    state_path = home / STATE_RELATIVE_PATH
    previous_state = load_state(state_path)
    previous_owned = previous_state.get("owned")
    if not isinstance(previous_owned, dict):
        previous_owned = {}

    copy_regular_file(source / "AGENTS.md", home / ".pi/agent/AGENTS.md")
    copy_regular_file(source / "AGENTS.md", home / ".agents/AGENTS.md")

    next_owned: dict[str, list[str]] = {}
    for name, source_root, target_root in resources(home, source):
        target_root.mkdir(parents=True, exist_ok=True)
        remove_legacy_links(target_root)
        desired = desired_names(source_root)
        next_owned[name] = desired
        previous = previous_owned.get(name, [])
        if isinstance(previous, list):
            safe_previous = {entry for entry in previous if safe_entry_name(entry)}
            for obsolete in safe_previous - set(desired):
                obsolete_path = target_root / obsolete
                if lexists(obsolete_path):
                    remove_path(obsolete_path)
        for entry in desired:
            sync_entry(source_root / entry, target_root / entry)

    install_dependencies(source, home)

    state = {"version": MANAGER_VERSION, "owned": next_owned}
    write_atomic_text(state_path, json.dumps(state, indent=2, sort_keys=True) + "\n")


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in {"check", "apply"}:
        print(f"usage: {sys.argv[0]} <check|apply> HOME", file=sys.stderr)
        return 2

    source = Path(__file__).resolve().parent
    home = Path(sys.argv[2]).expanduser().resolve()
    validate_source(source)
    if sys.argv[1] == "check":
        print("clean" if is_clean(home, source) else "drift")
    else:
        apply(home, source)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
