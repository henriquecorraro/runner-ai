"""Parse workspace config and task markdown files."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from .models import WorkspaceConfig, GitHubProject, Repository, TaskDef

ACTIONABLE_STATUSES = {"open", "needs-rework"}


def load_workspace(config_path: str) -> WorkspaceConfig:
    """Load workspace config from JSON file."""
    p = Path(config_path).resolve()
    raw = json.loads(p.read_text())
    config_dir = p.parent

    sdd_root = config_dir / (raw.get("sddRoot", "sdd"))
    tasks_dir = sdd_root / "tasks"
    history_root = config_dir / (raw.get("historyRoot", "runs"))
    skills_dir = config_dir / "skills"

    repos = []
    for r in raw.get("repositories", []):
        root = (config_dir / r["path"]).resolve() if "path" in r else Path(r.get("root", ""))
        repos.append(Repository(
            id=r["id"],
            label=r.get("label", r["id"]),
            root=str(root),
            validation=r.get("validation", []),
            docs_hints=r.get("docsHints", []),
        ))

    github_project = None
    gh_raw = raw.get("githubProject")
    if gh_raw and gh_raw.get("url"):
        owner = gh_raw.get("owner", "")
        owner_type = gh_raw.get("ownerType", "organization")
        number = gh_raw.get("number", 0)
        # Parse from URL if not explicitly set
        if not owner or not number:
            import re as _re
            m = _re.match(r"https://github\.com/(orgs|users)/([^/]+)/projects/(\d+)", gh_raw["url"])
            if m:
                owner_type = "organization" if m.group(1) == "orgs" else "user"
                owner = owner or m.group(2)
                number = number or int(m.group(3))
        github_project = GitHubProject(
            url=gh_raw["url"],
            owner=owner,
            owner_type=owner_type,
            number=number,
        )

    return WorkspaceConfig(
        name=raw["name"],
        config_path=str(p),
        config_dir=str(config_dir),
        sdd_root=str(sdd_root),
        tasks_dir=str(tasks_dir),
        history_root=str(history_root),
        skills_dir=str(skills_dir),
        repositories=repos,
        github_project=github_project,
    )


def _parse_scalar(raw: str) -> str | bool:
    v = raw.strip()
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        return v[1:-1]
    if v == "true":
        return True
    if v == "false":
        return False
    return v


def _parse_frontmatter(text: str) -> dict:
    result: dict = {}
    current_key: Optional[str] = None
    for line in text.split("\n"):
        line = line.rstrip("\r")
        if not line.strip():
            continue
        arr_match = re.match(r"^\s*-\s+(.*)$", line)
        if arr_match:
            if current_key:
                result[current_key].append(_parse_scalar(arr_match.group(1)))
            continue
        kv_match = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not kv_match:
            continue
        key, raw_val = kv_match.group(1), kv_match.group(2)
        if not raw_val.strip():
            result[key] = []
            current_key = key
        else:
            result[key] = _parse_scalar(raw_val)
            current_key = None
    return result


def parse_task_file(file_path: str) -> TaskDef:
    """Parse a single task .md file with frontmatter."""
    content = Path(file_path).read_text()
    m = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", content)
    if not m:
        raise ValueError(f"Task file must start with YAML frontmatter: {file_path}")

    meta = _parse_frontmatter(m.group(1))
    body = m.group(2).strip()
    fname = os.path.basename(file_path)
    task_id = str(meta.get("id", fname.replace(".md", "")))

    return TaskDef(
        id=task_id,
        title=str(meta.get("title", task_id)),
        scope=str(meta["scope"]) if "scope" in meta else None,
        status=str(meta.get("status", "open")).lower(),
        repositories=list(meta.get("repositories", [])),
        validation=list(meta.get("validation", [])),
        docs_targets=list(meta.get("docs_targets", [])),
        depends_on=list(meta.get("depends_on", [])),
        body=body,
        file_path=file_path,
        file_name=fname,
        github_project_item_id=int(meta["github_project_item_id"]) if meta.get("github_project_item_id") else None,
    )


def load_tasks(workspace: WorkspaceConfig, status_filter: Optional[set[str]] = None) -> list[TaskDef]:
    """Load all tasks from workspace, optionally filtered by status."""
    tasks_dir = Path(workspace.tasks_dir)
    if not tasks_dir.is_dir():
        return []
    tasks = []
    for f in sorted(tasks_dir.glob("*.md")):
        task = parse_task_file(str(f))
        if status_filter and task.status not in status_filter:
            continue
        tasks.append(task)
    return tasks
