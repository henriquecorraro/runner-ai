"""GitHub Project board status management for kiro runner."""
from __future__ import annotations

import json
import subprocess
from typing import Optional

from .models import WorkspaceConfig, GitHubProject, TaskDef

BOARD_STATUS_MAP = {
    "in-progress": "In Progress",
    "testing": "Testing",
    "todo": "Todo",
    "done": "Done",
}


def move_task_card(eco: WorkspaceConfig, task: TaskDef, status: str) -> None:
    """Move a task's project card to the given status. Fails silently."""
    if not eco.github_project or not task.github_project_item_id:
        return
    try:
        target = BOARD_STATUS_MAP.get(status, status)
        field_id, option_id = _resolve_status_option(eco.github_project, target)
        if not field_id or not option_id:
            return
        _update_item_field(eco.github_project, task.github_project_item_id, field_id, option_id)
    except Exception:
        pass  # Non-critical


def _resolve_status_option(project: GitHubProject, status_name: str) -> tuple[Optional[str], Optional[str]]:
    endpoint = _project_endpoint(project, "fields?per_page=100")
    result = subprocess.run(
        ["gh", "api", endpoint, "--method", "GET",
         "--header", "Accept: application/vnd.github+json"],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0:
        return None, None

    fields = json.loads(result.stdout)
    status_field = next((f for f in fields if f.get("name", "").lower() == "status"), None)
    if not status_field:
        return None, None

    target = status_name.lower().replace(" ", "")
    for opt in status_field.get("options", []):
        name = opt.get("name", "")
        if isinstance(name, dict):
            name = name.get("raw", name.get("html", ""))
        if name.lower().replace(" ", "") == target:
            return str(status_field["id"]), str(opt["id"])

    return None, None


def _update_item_field(project: GitHubProject, item_id: int, field_id: str, option_id: str) -> None:
    endpoint = _project_endpoint(project, f"items/{item_id}")
    body = json.dumps({"fields": [{"id": field_id, "value": option_id}]})
    subprocess.run(
        ["gh", "api", endpoint, "--method", "PATCH",
         "--header", "Accept: application/vnd.github+json",
         "--input", "-"],
        input=body, capture_output=True, text=True, timeout=15,
    )


def _project_endpoint(project: GitHubProject, suffix: str) -> str:
    if project.owner_type == "organization":
        return f"/orgs/{project.owner}/projectsV2/{project.number}/{suffix}"
    return f"/users/{project.owner}/projectsV2/{project.number}/{suffix}"
