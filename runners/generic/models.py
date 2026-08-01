from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


@dataclass(frozen=True)
class ModelRoute:
    max_prompt_tokens: int
    model: str
    reasoning_effort: Optional[str] = None


@dataclass
class CodexOptions:
    session_policy: str = "task"
    resume_on_needs_rework: bool = True
    sandbox: str = "workspace-write"
    approval_policy: str = "never"
    profile: Optional[str] = None
    ignore_user_config: bool = False
    ignore_rules: bool = False
    mechanical_model: str = "gpt-5.6-luna"
    standard_model: str = "gpt-5.6-terra"
    deep_model: str = "gpt-5.6-sol"
    mechanical_reasoning: str = "low"
    standard_reasoning: str = "medium"
    deep_reasoning: str = "high"


@dataclass
class AgentConfig:
    """Agent command definition from workspace config."""
    name: str
    command: str
    args: list[str] = field(default_factory=list)
    type: Optional[str] = None
    model: Optional[str] = None
    env: dict[str, str] = field(default_factory=dict)
    timeout_seconds: int = 3600
    model_routes: list[ModelRoute] = field(default_factory=list)
    reasoning_effort: Optional[str] = None
    allowed_models: list[str] = field(default_factory=list)
    codex: Optional[CodexOptions] = None

    def resolve_model(self, prompt_tokens: int) -> Optional[str]:
        for route in sorted(self.model_routes, key=lambda item: item.max_prompt_tokens):
            if prompt_tokens <= route.max_prompt_tokens:
                return route.model
        return self.model

    @property
    def is_codex(self) -> bool:
        return (self.type or self.name).lower() == "codex"

    @property
    def configured_models(self) -> set[str]:
        models = set(self.allowed_models)
        if self.model:
            models.add(self.model)
        models.update(route.model for route in self.model_routes)
        if self.codex:
            models.update({
                self.codex.mechanical_model,
                self.codex.standard_model,
                self.codex.deep_model,
            })
        return models

    def supports_model(self, model: str) -> bool:
        return model in self.configured_models


@dataclass
class TokenPolicy:
    context_budget_tokens: int = 4000
    review_diff_budget_tokens: int = 2000
    batch_related_tasks: bool = False
    batch_size: int = 3


@dataclass
class GitHubProject:
    """GitHub Project V2 metadata from workspace config."""
    url: str
    owner: str
    owner_type: str
    number: int


@dataclass
class TaskDef:
    """Parsed from .md frontmatter."""
    id: str
    title: str
    scope: Optional[str]
    status: str
    repositories: list[str]
    validation: list[str]
    docs_targets: list[str]
    depends_on: list[str]
    body: str
    file_path: str
    file_name: str
    github_project_item_id: Optional[int] = None
    complexity: Optional[str] = None
    risk: Optional[str] = None
    execution_profile: Optional[str] = None
    execution_agent: Optional[str] = None
    routing_policy: Optional[str] = None
    preferred_model: Optional[str] = None
    reasoning_effort: Optional[str] = None


@dataclass
class Repository:
    id: str
    label: str
    root: str
    validation: list[str] = field(default_factory=list)
    docs_hints: list[str] = field(default_factory=list)


@dataclass
class WorkspaceConfig:
    name: str
    config_path: str
    config_dir: str
    sdd_root: str
    tasks_dir: str
    history_root: str
    skills_dir: str
    repositories: list[Repository] = field(default_factory=list)
    github_project: Optional[GitHubProject] = None
    default_agent: str = "codex"
    agents: dict[str, AgentConfig] = field(default_factory=dict)
    token_policy: TokenPolicy = field(default_factory=TokenPolicy)

    def resolve_agent(self, override: Optional[str] = None) -> AgentConfig:
        """Resolve a configured agent without silently substituting another CLI."""
        name = override or self.default_agent
        if name in self.agents:
            return self.agents[name]
        available = ", ".join(sorted(self.agents)) or "none"
        raise ValueError(f"Agent '{name}' is not configured. Available agents: {available}.")


@dataclass
class TaskRun:
    """Runtime state of a single task within a parallel run."""
    task: TaskDef
    status: TaskStatus = TaskStatus.QUEUED
    pid: Optional[int] = None
    exit_code: Optional[int] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    last_lines: list[str] = field(default_factory=list)
    error: Optional[str] = None
    stage_dir: Optional[str] = None
    agent: Optional[AgentConfig] = None
    routing: dict = field(default_factory=dict)


@dataclass
class Run:
    """Top-level parallel run."""
    id: str
    workspace: str
    concurrency: int
    agent: Optional[AgentConfig] = None
    tasks: dict[str, TaskRun] = field(default_factory=dict)
    satisfied_dependencies: set[str] = field(default_factory=set)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    @property
    def completed(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status in (TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.BLOCKED, TaskStatus.SKIPPED))

    @property
    def total(self) -> int:
        return len(self.tasks)

    @property
    def running(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status == TaskStatus.RUNNING)
