from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from .config import load_workspace
from .models import AgentConfig, Run, TaskDef, TaskRun, TaskStatus
from .runner import resolve_ready_tasks, skip_blocked
from .worker import build_agent_command, build_agent_env


def make_task(task_id: str, depends_on: list[str] | None = None) -> TaskDef:
    return TaskDef(
        id=task_id,
        title=task_id,
        scope=None,
        status="open",
        repositories=[],
        validation=[],
        docs_targets=[],
        depends_on=depends_on or [],
        body="",
        file_path=f"{task_id}.md",
        file_name=f"{task_id}.md",
    )


class DependencyResolutionTests(unittest.TestCase):
    def test_waits_for_selected_dependency(self):
        dependency = make_task("dependency")
        dependent = make_task("dependent", ["dependency"])
        run = Run(id="test", workspace="test", concurrency=2)
        run.tasks = {
            dependency.id: TaskRun(task=dependency, status=TaskStatus.RUNNING),
            dependent.id: TaskRun(task=dependent),
        }

        self.assertNotIn("dependent", resolve_ready_tasks(run))

    def test_accepts_completed_external_dependency(self):
        dependent = make_task("dependent", ["completed"])
        run = Run(
            id="test",
            workspace="test",
            concurrency=1,
            satisfied_dependencies={"completed"},
            tasks={dependent.id: TaskRun(task=dependent)},
        )

        self.assertEqual(resolve_ready_tasks(run), ["dependent"])

    def test_skips_missing_dependency(self):
        dependent = make_task("dependent", ["missing"])
        run = Run(
            id="test",
            workspace="test",
            concurrency=1,
            tasks={dependent.id: TaskRun(task=dependent)},
        )

        self.assertEqual(skip_blocked(run), ["dependent"])
        self.assertEqual(run.tasks["dependent"].status, TaskStatus.SKIPPED)


class GenericAgentConfigTests(unittest.TestCase):
    def test_resolves_arbitrary_workspace_agent(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "workspace.config.json"
            config_path.write_text(json.dumps({
                "name": "test",
                "defaultAgent": "custom",
                "agents": {
                    "custom": {
                        "command": "custom-agent",
                        "args": ["run"],
                        "model": "custom-model",
                    }
                },
            }))

            agent = load_workspace(str(config_path)).resolve_agent()

        self.assertEqual(agent.name, "custom")
        self.assertEqual(agent.command, "custom-agent")
        self.assertEqual(agent.args, ["run"])
        self.assertEqual(agent.model, "custom-model")

    def test_builds_command_from_workspace_agent_only(self):
        agent = AgentConfig(
            name="custom",
            command="custom-agent",
            args=["execute", "--json"],
            model="custom-model",
            env={"CUSTOM_TOKEN_MODE": "workspace"},
        )

        command, args = build_agent_command(agent, "execute prompt.md")
        env = build_agent_env(agent)

        self.assertEqual(command, "custom-agent")
        self.assertEqual(args, ["execute", "--json", "--model", "custom-model", "execute prompt.md"])
        self.assertEqual(env["CUSTOM_TOKEN_MODE"], "workspace")


if __name__ == "__main__":
    unittest.main()
