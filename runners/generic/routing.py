"""Deterministic task-to-agent routing for mixed-CLI workspaces."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .models import AgentConfig, TaskDef, WorkspaceConfig

ROUTING_POLICIES = {"pinned", "preferred", "portable"}


@dataclass(frozen=True)
class AgentDecision:
    agent: AgentConfig
    policy: str
    requested_agent: Optional[str]
    source: str
    fallback_reason: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "policy": self.policy,
            "requestedAgent": self.requested_agent,
            "selectedAgent": self.agent.name,
            "agentSource": self.source,
            "fallbackReason": self.fallback_reason,
        }


def task_routing_policy(task: TaskDef) -> str:
    return task.routing_policy or "preferred"


def validate_task_routing_shape(task: TaskDef) -> None:
    policy = task_routing_policy(task)
    if policy not in ROUTING_POLICIES:
        raise ValueError(f"Task '{task.id}' has unsupported routing_policy '{policy}'.")
    if policy == "pinned" and not task.execution_agent:
        raise ValueError(f"Task '{task.id}' uses pinned routing but has no execution_agent.")
    if policy == "portable":
        forbidden = [
            name for name, value in (
                ("execution_agent", task.execution_agent),
                ("preferred_model", task.preferred_model),
                ("reasoning_effort", task.reasoning_effort),
            ) if value
        ]
        if forbidden:
            raise ValueError(
                f"Task '{task.id}' uses portable routing and cannot define: {', '.join(forbidden)}."
            )


def resolve_task_agent(
    workspace: WorkspaceConfig,
    task: TaskDef,
    override: Optional[AgentConfig] = None,
    allow_override: bool = False,
) -> AgentDecision:
    validate_task_routing_shape(task)
    policy = task_routing_policy(task)
    requested = task.execution_agent if policy != "portable" else None

    if override:
        if policy == "pinned" and requested != override.name and not allow_override:
            raise ValueError(
                f"Task '{task.id}' is pinned to agent '{requested}'. "
                f"Override '{override.name}' requires --allow-agent-override."
            )
        return AgentDecision(
            agent=override,
            policy=policy,
            requested_agent=requested,
            source="forced-cli" if policy == "pinned" and requested != override.name else "cli",
            fallback_reason=(
                f"Explicit CLI override replaced pinned agent '{requested}'."
                if policy == "pinned" and requested != override.name else None
            ),
        )

    if requested and requested in workspace.agents:
        return AgentDecision(workspace.agents[requested], policy, requested, "task")
    if requested and policy == "pinned":
        available = ", ".join(sorted(workspace.agents)) or "none"
        raise ValueError(
            f"Task '{task.id}' is pinned to unavailable agent '{requested}'. Available agents: {available}."
        )

    default = workspace.resolve_agent()
    return AgentDecision(
        agent=default,
        policy=policy,
        requested_agent=requested,
        source="workspace-default",
        fallback_reason=(f"Preferred agent '{requested}' is unavailable." if requested else None),
    )


def validate_pinned_model(task: TaskDef, agent: AgentConfig) -> None:
    if (
        task_routing_policy(task) == "pinned"
        and task.preferred_model
        and not agent.supports_model(task.preferred_model)
    ):
        configured = ", ".join(sorted(agent.configured_models)) or "none"
        raise ValueError(
            f"Task '{task.id}' is pinned to unsupported model '{task.preferred_model}' "
            f"for agent '{agent.name}'. Configured models: {configured}."
        )


def routing_batch_key(task: TaskDef, agent: AgentConfig) -> tuple:
    return (
        agent.name,
        task.execution_profile,
        task.preferred_model if task_routing_policy(task) != "portable" else None,
        task.reasoning_effort if task_routing_policy(task) != "portable" else None,
        task_routing_policy(task),
    )
