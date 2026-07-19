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
    SKIPPED = "skipped"


@dataclass
class AgentConfig:
    """Agent command definition from workspace config."""
    name: str
    command: str
    args: list[str] = field(default_factory=list)
    type: Optional[str] = None
    model: Optional[str] = None
    env: dict[str, str] = field(default_factory=dict)


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

    def resolve_agent(self, override: Optional[str] = None) -> AgentConfig:
        """Resolve which agent to use. Override > defaultAgent > first available."""
        name = override or self.default_agent
        if name in self.agents:
            return self.agents[name]
        if self.agents:
            return next(iter(self.agents.values()))
        # Fallback: construct from name
        return AgentConfig(name=name, command=name, args=[])


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


@dataclass
class Run:
    """Top-level parallel run."""
    id: str
    workspace: str
    concurrency: int
    agent: Optional[AgentConfig] = None
    tasks: dict[str, TaskRun] = field(default_factory=dict)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    @property
    def completed(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status in (TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.SKIPPED))

    @property
    def total(self) -> int:
        return len(self.tasks)

    @property
    def running(self) -> int:
        return sum(1 for t in self.tasks.values() if t.status == TaskStatus.RUNNING)
