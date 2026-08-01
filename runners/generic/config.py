"""Parse workspace config and task markdown files."""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Optional

from .models import WorkspaceConfig, GitHubProject, Repository, TaskDef, AgentConfig, ModelRoute, TokenPolicy, CodexOptions

ACTIONABLE_STATUSES = {"open", "needs-rework"}
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
TASK_FRONTMATTER_SCHEMA = json.loads((REPOSITORY_ROOT / "schemas" / "task-frontmatter.json").read_text())


def _contained_path(base: Path, raw_value: str, field_name: str) -> Path:
    value = Path(raw_value)
    if value.is_absolute():
        raise ValueError(f"Field '{field_name}' must be relative to {base}.")
    resolved = (base / value).resolve()
    if resolved != base and base not in resolved.parents:
        raise ValueError(f"Field '{field_name}' must stay inside {base}.")
    return resolved


def _string_list(value, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError(f"Field '{field_name}' must be an array of non-empty strings.")
    return value


def _positive_integer(value, field_name: str, default: int) -> int:
    resolved = default if value is None else value
    if not isinstance(resolved, int) or isinstance(resolved, bool) or resolved < 1:
        raise ValueError(f"Field '{field_name}' must be a positive integer.")
    return resolved


def _optional_string(value, field_name: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Field '{field_name}' must be a non-empty string when provided.")
    return value


def _enum(value, field_name: str, allowed: set[str], default: Optional[str] = None) -> Optional[str]:
    resolved = default if value is None else value
    if resolved is None:
        return None
    if not isinstance(resolved, str) or resolved not in allowed:
        raise ValueError(f"Field '{field_name}' must be one of: {', '.join(sorted(allowed))}.")
    return resolved


def _boolean(value, field_name: str, default: bool) -> bool:
    resolved = default if value is None else value
    if not isinstance(resolved, bool):
        raise ValueError(f"Field '{field_name}' must be a boolean.")
    return resolved


def load_workspace(config_path: str) -> WorkspaceConfig:
    """Load workspace config from JSON file."""
    p = Path(config_path).resolve()
    raw = json.loads(p.read_text())
    config_dir = p.parent
    if not isinstance(raw, dict) or not isinstance(raw.get("name"), str) or not raw["name"].strip():
        raise ValueError("Workspace config field 'name' must be a non-empty string.")

    sdd_root = _contained_path(config_dir, raw.get("sddRoot", "sdd"), "sddRoot")
    tasks_dir = sdd_root / "tasks"
    history_root = _contained_path(config_dir, raw.get("historyRoot", "runs"), "historyRoot")
    skills_dir = config_dir / "skills"

    repositories_raw = raw.get("repositories", [])
    if not isinstance(repositories_raw, list):
        raise ValueError("Workspace config field 'repositories' must be an array.")
    repos = []
    repo_ids = set()
    for r in repositories_raw:
        if not isinstance(r, dict) or not isinstance(r.get("id"), str) or not r["id"].strip():
            raise ValueError("Each repository must have a non-empty string id.")
        if r["id"] in repo_ids:
            raise ValueError(f"Duplicate repository id '{r['id']}'.")
        repo_ids.add(r["id"])
        raw_root = r.get("path", r.get("root"))
        if not isinstance(raw_root, str) or not raw_root.strip():
            raise ValueError(f"Repository '{r['id']}' must define path.")
        root = (config_dir / raw_root).resolve() if not Path(raw_root).is_absolute() else Path(raw_root).resolve()
        if not root.is_dir():
            raise ValueError(f"Repository '{r['id']}' path does not exist: {root}")
        git_check = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=30,
        )
        if git_check.returncode != 0:
            raise ValueError(f"Repository '{r['id']}' path is not a Git working tree: {root}")
        git_root = Path(git_check.stdout.strip()).resolve()
        if git_root != root:
            raise ValueError(f"Repository '{r['id']}' path must be the Git top-level directory: {git_root}")
        repos.append(Repository(
            id=r["id"],
            label=r.get("label", r["id"]),
            root=str(root),
            validation=_string_list(r.get("validation", []), f"repositories.{r['id']}.validation"),
            docs_hints=_string_list(r.get("docsHints", []), f"repositories.{r['id']}.docsHints"),
        ))

    github_project = None
    gh_raw = raw.get("githubProject")
    if gh_raw and gh_raw.get("url"):
        owner = gh_raw.get("owner", "")
        owner_type = gh_raw.get("ownerType", "organization")
        number = gh_raw.get("number", 0)
        # Parse from URL if not explicitly set
        if not owner or not number:
            m = re.match(r"https://github\.com/(orgs|users)/([^/]+)/projects/(\d+)", gh_raw["url"])
            if m:
                owner_type = "organization" if m.group(1) == "orgs" else "user"
                owner = owner or m.group(2)
                number = number or int(m.group(3))
        if owner_type not in {"organization", "user"} or not owner or not isinstance(number, int) or number < 1:
            raise ValueError(f"Invalid githubProject configuration: {gh_raw.get('url')}")
        github_project = GitHubProject(
            url=gh_raw["url"],
            owner=owner,
            owner_type=owner_type,
            number=number,
        )

    # Load agents from config
    agents: dict[str, AgentConfig] = {}
    agents_raw = raw.get("agents", {})
    if not isinstance(agents_raw, dict):
        raise ValueError("Workspace config field 'agents' must be an object.")
    for agent_name, agent_raw in agents_raw.items():
        if not agent_name.strip():
            raise ValueError("Agent names must be non-empty strings.")
        if not isinstance(agent_raw, dict):
            raise ValueError(f"Agent '{agent_name}' configuration must be an object.")
        command = agent_raw.get("command", agent_name)
        if not isinstance(command, str) or not command.strip():
            raise ValueError(f"Agent '{agent_name}' command must be a non-empty string.")
        args = _string_list(agent_raw.get("args", []), f"agents.{agent_name}.args")
        env = agent_raw.get("env", {})
        if not isinstance(env, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in env.items()):
            raise ValueError(f"Agent '{agent_name}' env must map strings to strings.")
        timeout_seconds = agent_raw.get("timeoutSeconds", 3600)
        if not isinstance(timeout_seconds, int) or isinstance(timeout_seconds, bool) or timeout_seconds < 1:
            raise ValueError(f"Agent '{agent_name}' timeoutSeconds must be a positive integer.")
        agent_type = agent_raw.get("type")
        if agent_type is not None and (not isinstance(agent_type, str) or not agent_type.strip()):
            raise ValueError(f"Agent '{agent_name}' type must be a non-empty string when provided.")
        model = _optional_string(agent_raw.get("model"), f"agents.{agent_name}.model")
        reasoning_effort = _enum(
            agent_raw.get("reasoningEffort"), f"agents.{agent_name}.reasoningEffort",
            {"low", "medium", "high", "xhigh"},
        )
        allowed_models = _string_list(agent_raw.get("allowedModels", []), f"agents.{agent_name}.allowedModels")
        if len(set(allowed_models)) != len(allowed_models):
            raise ValueError(f"Agent '{agent_name}' allowedModels must not contain duplicates.")
        routes_raw = agent_raw.get("modelRoutes", [])
        if not isinstance(routes_raw, list):
            raise ValueError(f"Agent '{agent_name}' modelRoutes must be an array.")
        model_routes = []
        for index, route in enumerate(routes_raw):
            if not isinstance(route, dict):
                raise ValueError(f"Agent '{agent_name}' modelRoutes.{index} must be an object.")
            route_model = route.get("model")
            if not isinstance(route_model, str) or not route_model.strip():
                raise ValueError(f"Agent '{agent_name}' modelRoutes.{index}.model must be a non-empty string.")
            model_routes.append(ModelRoute(
                max_prompt_tokens=_positive_integer(route.get("maxPromptTokens"), f"agents.{agent_name}.modelRoutes.{index}.maxPromptTokens", 1),
                model=route_model,
                reasoning_effort=_enum(
                    route.get("reasoningEffort"), f"agents.{agent_name}.modelRoutes.{index}.reasoningEffort",
                    {"low", "medium", "high", "xhigh"},
                ),
            ))
        if len({route.max_prompt_tokens for route in model_routes}) != len(model_routes):
            raise ValueError(f"Agent '{agent_name}' modelRoutes maxPromptTokens values must be unique.")
        codex_options = None
        codex_raw = agent_raw.get("codex")
        if codex_raw is not None or (agent_type or agent_name).lower() == "codex":
            codex_raw = codex_raw or {}
            if not isinstance(codex_raw, dict):
                raise ValueError(f"Agent '{agent_name}' codex configuration must be an object.")
            models_raw = codex_raw.get("models", {})
            reasoning_raw = codex_raw.get("reasoning", {})
            if not isinstance(models_raw, dict):
                raise ValueError(f"Agent '{agent_name}' codex.models must be an object.")
            if not isinstance(reasoning_raw, dict):
                raise ValueError(f"Agent '{agent_name}' codex.reasoning must be an object.")
            codex_options = CodexOptions(
                session_policy=_enum(codex_raw.get("sessionPolicy"), f"agents.{agent_name}.codex.sessionPolicy", {"task", "ephemeral"}, "task"),
                resume_on_needs_rework=_boolean(codex_raw.get("resumeOnNeedsRework"), f"agents.{agent_name}.codex.resumeOnNeedsRework", True),
                sandbox=_enum(codex_raw.get("sandbox"), f"agents.{agent_name}.codex.sandbox", {"read-only", "workspace-write", "danger-full-access"}, "workspace-write"),
                approval_policy=_enum(codex_raw.get("approvalPolicy"), f"agents.{agent_name}.codex.approvalPolicy", {"untrusted", "on-request", "never"}, "never"),
                profile=_optional_string(codex_raw.get("profile"), f"agents.{agent_name}.codex.profile"),
                ignore_user_config=_boolean(codex_raw.get("ignoreUserConfig"), f"agents.{agent_name}.codex.ignoreUserConfig", False),
                ignore_rules=_boolean(codex_raw.get("ignoreRules"), f"agents.{agent_name}.codex.ignoreRules", False),
                mechanical_model=_optional_string(models_raw.get("mechanical"), f"agents.{agent_name}.codex.models.mechanical") or "gpt-5.6-luna",
                standard_model=_optional_string(models_raw.get("standard"), f"agents.{agent_name}.codex.models.standard") or "gpt-5.6-terra",
                deep_model=_optional_string(models_raw.get("deep"), f"agents.{agent_name}.codex.models.deep") or "gpt-5.6-sol",
                mechanical_reasoning=_enum(reasoning_raw.get("mechanical"), f"agents.{agent_name}.codex.reasoning.mechanical", {"low", "medium", "high", "xhigh"}, "low"),
                standard_reasoning=_enum(reasoning_raw.get("standard"), f"agents.{agent_name}.codex.reasoning.standard", {"low", "medium", "high", "xhigh"}, "medium"),
                deep_reasoning=_enum(reasoning_raw.get("deep"), f"agents.{agent_name}.codex.reasoning.deep", {"low", "medium", "high", "xhigh"}, "high"),
            )
        agents[agent_name] = AgentConfig(
            name=agent_name,
            command=command,
            args=args,
            type=agent_type,
            model=model,
            env=env,
            timeout_seconds=timeout_seconds,
            model_routes=model_routes,
            reasoning_effort=reasoning_effort,
            allowed_models=allowed_models,
            codex=codex_options,
        )

    default_agent = raw.get("defaultAgent", "codex")
    if not isinstance(default_agent, str) or not default_agent.strip():
        raise ValueError("Workspace config field 'defaultAgent' must be a non-empty string.")

    token_policy_raw = raw.get("tokenPolicy", {})
    if not isinstance(token_policy_raw, dict):
        raise ValueError("Workspace config field 'tokenPolicy' must be an object.")
    batch_related_tasks = token_policy_raw.get("batchRelatedTasks", False)
    if not isinstance(batch_related_tasks, bool):
        raise ValueError("Field 'tokenPolicy.batchRelatedTasks' must be a boolean.")
    token_policy = TokenPolicy(
        context_budget_tokens=_positive_integer(token_policy_raw.get("contextBudgetTokens"), "tokenPolicy.contextBudgetTokens", 4000),
        review_diff_budget_tokens=_positive_integer(token_policy_raw.get("reviewDiffBudgetTokens"), "tokenPolicy.reviewDiffBudgetTokens", 2000),
        batch_related_tasks=batch_related_tasks,
        batch_size=_positive_integer(token_policy_raw.get("batchSize"), "tokenPolicy.batchSize", 3),
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
        default_agent=default_agent,
        agents=agents,
        token_policy=token_policy,
    )


def _parse_scalar(raw: str) -> str | bool | list:
    v = raw.strip()
    if v.startswith("[") and v.endswith("]"):
        value = json.loads(v)
        if not isinstance(value, list):
            raise ValueError(f"Invalid inline frontmatter array: {v}")
        return value
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
            if not current_key:
                raise ValueError(f"Invalid frontmatter array item without key: {line}")
            result[current_key].append(_parse_scalar(arr_match.group(1)))
            continue
        kv_match = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not kv_match:
            raise ValueError(f"Unsupported frontmatter line: {line}")
        key, raw_val = kv_match.group(1), kv_match.group(2)
        if not raw_val.strip():
            result[key] = []
            current_key = key
        else:
            result[key] = _parse_scalar(raw_val)
            current_key = None
    return result


def _validate_task_frontmatter(meta: dict, file_path: str) -> None:
    known = set(TASK_FRONTMATTER_SCHEMA["scalarFields"]) | set(TASK_FRONTMATTER_SCHEMA["arrayFields"])
    for key in meta:
        if key not in known:
            raise ValueError(f"Unknown frontmatter field '{key}' in {file_path}.")
    for field in TASK_FRONTMATTER_SCHEMA["required"]:
        if field not in meta or not str(meta[field]).strip():
            raise ValueError(f"Missing required frontmatter field '{field}' in {file_path}.")
    for field in TASK_FRONTMATTER_SCHEMA["arrayFields"]:
        if field in meta and not isinstance(meta[field], list):
            raise ValueError(f"Frontmatter field '{field}' must be an array in {file_path}.")
    for field in TASK_FRONTMATTER_SCHEMA["scalarFields"]:
        if field in meta and isinstance(meta[field], list):
            raise ValueError(f"Frontmatter field '{field}' must be a scalar in {file_path}.")
    status = str(meta["status"]).lower()
    if status not in TASK_FRONTMATTER_SCHEMA["statusValues"]:
        raise ValueError(f"Unsupported task status '{meta['status']}' in {file_path}.")
    execution_state = meta.get("execution_state")
    if execution_state and str(execution_state) not in TASK_FRONTMATTER_SCHEMA["executionStateValues"]:
        raise ValueError(f"Unsupported execution state '{execution_state}' in {file_path}.")
    enum_fields = {
        "complexity": "complexityValues",
        "risk": "riskValues",
        "execution_profile": "executionProfileValues",
        "routing_policy": "routingPolicyValues",
        "reasoning_effort": "reasoningEffortValues",
    }
    for field, values_key in enum_fields.items():
        if field in meta and str(meta[field]).lower() not in TASK_FRONTMATTER_SCHEMA[values_key]:
            raise ValueError(f"Unsupported {field} '{meta[field]}' in {file_path}.")


def parse_task_file(file_path: str) -> TaskDef:
    """Parse a single task .md file with frontmatter."""
    content = Path(file_path).read_text()
    m = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", content)
    if not m:
        raise ValueError(f"Task file must start with YAML frontmatter: {file_path}")

    meta = _parse_frontmatter(m.group(1))
    _validate_task_frontmatter(meta, file_path)
    body = m.group(2).strip()
    fname = os.path.basename(file_path)
    task_id = str(meta["id"])

    return TaskDef(
        id=task_id,
        title=str(meta["title"]),
        scope=str(meta["scope"]) if "scope" in meta else None,
        status=str(meta["status"]).lower(),
        repositories=list(meta.get("repositories", [])),
        validation=list(meta.get("validation", [])),
        docs_targets=list(meta.get("docs_targets", [])),
        depends_on=list(meta.get("depends_on", [])),
        body=body,
        file_path=file_path,
        file_name=fname,
        github_project_item_id=int(meta["github_project_item_id"]) if meta.get("github_project_item_id") else None,
        complexity=str(meta["complexity"]).lower() if meta.get("complexity") else None,
        risk=str(meta["risk"]).lower() if meta.get("risk") else None,
        execution_profile=str(meta["execution_profile"]).lower() if meta.get("execution_profile") else None,
        execution_agent=str(meta["execution_agent"]) if meta.get("execution_agent") else None,
        routing_policy=str(meta["routing_policy"]).lower() if meta.get("routing_policy") else None,
        preferred_model=str(meta["preferred_model"]) if meta.get("preferred_model") else None,
        reasoning_effort=str(meta["reasoning_effort"]).lower() if meta.get("reasoning_effort") else None,
    )


def load_tasks(workspace: WorkspaceConfig, status_filter: Optional[set[str]] = None) -> list[TaskDef]:
    """Load all tasks from workspace, optionally filtered by status."""
    tasks_dir = Path(workspace.tasks_dir)
    if not tasks_dir.is_dir():
        return []
    tasks = []
    task_ids = set()
    known_repositories = {repository.id for repository in workspace.repositories}
    for f in sorted(tasks_dir.glob("*.md")):
        if f.name.endswith(".context.md"):
            continue  # Skip context snapshot files
        task = parse_task_file(str(f))
        if task.id in task_ids:
            raise ValueError(f"Duplicate task id '{task.id}' in {tasks_dir}.")
        task_ids.add(task.id)
        if len(set(task.repositories)) != len(task.repositories):
            raise ValueError(f"Task '{task.id}' contains duplicate repository ids.")
        unknown_repositories = sorted(set(task.repositories) - known_repositories)
        if unknown_repositories:
            raise ValueError(f"Task '{task.id}' references unknown repositories: {', '.join(unknown_repositories)}")
        from .routing import validate_task_routing_shape
        validate_task_routing_shape(task)
        if status_filter and task.status not in status_filter:
            continue
        tasks.append(task)
    return tasks
