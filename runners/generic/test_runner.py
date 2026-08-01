from __future__ import annotations

import json
import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from .config import load_workspace
from .models import AgentConfig, CodexOptions, ModelRoute, Repository, Run, TaskDef, TaskRun, TaskStatus, TokenPolicy, WorkspaceConfig
from .runner import execute, resolve_ready_tasks, skip_blocked
from .worker import build_agent_command, build_agent_env, build_prompt, run_task, validate_output_contract
from .context_cache import assemble_context, usage_summary
from .codex import build_codex_command, codex_batch_key, find_resumable_thread, resolve_codex_selection, task_spec_hash
from .routing import resolve_task_agent


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
                        "allowedModels": ["alternate-model"],
                    }
                },
            }))

            agent = load_workspace(str(config_path)).resolve_agent()

        self.assertEqual(agent.name, "custom")
        self.assertEqual(agent.command, "custom-agent")
        self.assertEqual(agent.args, ["run"])
        self.assertEqual(agent.model, "custom-model")
        self.assertEqual(agent.configured_models, {"custom-model", "alternate-model"})

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

        _command, overridden_args = build_agent_command(
            agent, "execute prompt.md", selected_model="task-model",
        )
        self.assertEqual(overridden_args, ["execute", "--json", "--model", "task-model", "execute prompt.md"])

    def test_rejects_unknown_agent_override(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({
                "name": "test",
                "defaultAgent": "configured",
                "agents": {"configured": {"command": "configured-agent"}},
            }, directory)
            with self.assertRaisesRegex(ValueError, "not configured"):
                workspace.resolve_agent("missing")

    def test_routes_small_prompts_to_configured_model(self):
        agent = AgentConfig(
            name="routed", command="agent", model="large-model",
            model_routes=[ModelRoute(max_prompt_tokens=1000, model="small-model")],
        )
        self.assertEqual(agent.resolve_model(500), "small-model")
        self.assertEqual(agent.resolve_model(2000), "large-model")
        self.assertTrue(agent.supports_model("small-model"))
        self.assertTrue(agent.supports_model("large-model"))

    def test_codex_routes_by_task_profile_before_prompt_size(self):
        agent = AgentConfig(
            name="codex", command="codex", codex=CodexOptions(),
            model_routes=[ModelRoute(max_prompt_tokens=100000, model="size-model", reasoning_effort="low")],
        )
        task = make_task("critical")
        task.risk = "critical"

        selection = resolve_codex_selection([task], agent, 50)

        self.assertEqual(selection.profile, "deep")
        self.assertEqual(selection.model, "gpt-5.6-sol")
        self.assertEqual(selection.reasoning_effort, "high")

    def test_codex_preferred_model_falls_back_but_pinned_rejects(self):
        agent = AgentConfig(name="codex", command="codex", codex=CodexOptions())
        task = make_task("task")
        task.preferred_model = "unknown-model"
        task.routing_policy = "preferred"
        preferred = resolve_codex_selection([task], agent, 100)
        self.assertEqual(preferred.model, "gpt-5.6-terra")
        self.assertIsNotNone(preferred.fallback_reason)
        task.routing_policy = "pinned"
        task.execution_agent = "codex"
        with self.assertRaisesRegex(ValueError, "not configured"):
            resolve_codex_selection([task], agent, 100)

    def test_codex_legacy_ephemeral_is_not_duplicated(self):
        agent = AgentConfig(
            name="codex", command="codex", args=["exec", "--ephemeral"], codex=CodexOptions(),
        )
        selection = resolve_codex_selection([make_task("task")], agent, 100)

        _command, args = build_codex_command(agent, selection, "/repo", "/schema", "/response")

        self.assertEqual(args.count("--ephemeral"), 1)
        self.assertIn("--json", args)
        self.assertEqual(args[-1], "-")

    def test_codex_adds_secondary_repository_roots(self):
        agent = AgentConfig(name="codex", command="codex", codex=CodexOptions())
        selection = resolve_codex_selection([make_task("task")], agent, 100)
        _command, args = build_codex_command(
            agent, selection, "/repo-a", "/schema", "/response", additional_dirs=["/repo-b"],
        )
        self.assertEqual(args[args.index("--add-dir") + 1], "/repo-b")

    def test_codex_batch_key_separates_cost_tiers(self):
        cheap = make_task("cheap")
        cheap.execution_profile = "mechanical"
        deep = make_task("deep")
        deep.execution_profile = "deep"
        self.assertNotEqual(codex_batch_key(cheap), codex_batch_key(deep))

    def test_codex_resumes_only_an_unchanged_needs_rework_task(self):
        with tempfile.TemporaryDirectory() as directory:
            task = make_task("task")
            task.status = "needs-rework"
            agent = AgentConfig(name="codex", command="codex", codex=CodexOptions())
            selection = resolve_codex_selection([task], agent, 100)
            summary_path = Path(directory) / "previous" / "01-task" / "summary.json"
            summary_path.parent.mkdir(parents=True)
            summary_path.write_text(json.dumps({
                "status": "failed", "tasks": [{"id": "task"}],
                "codex": {"threadId": "thread-123", "taskSpecHash": task_spec_hash(task, selection)},
            }))

            self.assertEqual(find_resumable_thread(directory, task, selection, "current"), "thread-123")
            task.body = "changed"
            self.assertIsNone(find_resumable_thread(directory, task, selection, "current"))


def load_workspace_from_data(data: dict, directory: str):
    config_path = Path(directory) / "workspace.config.json"
    config_path.write_text(json.dumps(data))
    return load_workspace(str(config_path))


class OutputContractTests(unittest.TestCase):
    def test_requires_complete_success_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "output.md"
            output.write_text("""# Workspace AI Runner Output

- Status: success
- Mode: centralized-workspace
- Task: task
- Repositories: repo
- Result: implemented
- Validation: tests passed
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: none
""")
            status, error = validate_output_contract(str(output), make_task("task"))
        self.assertEqual(status, TaskStatus.SUCCESS)
        self.assertIsNone(error)

    def test_missing_output_is_failed(self):
        status, error = validate_output_contract("/does/not/exist", make_task("task"))
        self.assertEqual(status, TaskStatus.FAILED)
        self.assertIn("not produced", error)

    def test_zero_exit_without_output_is_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            task_file = root / "task.md"
            task_file.write_text("---\nid: task\ntitle: Task\nstatus: open\n---\nDo work\n")
            task = make_task("task")
            task.file_path = str(task_file)
            workspace = load_workspace_from_data({"name": "test", "agents": {"true": {"command": "/bin/true"}}, "defaultAgent": "true"}, directory)
            workspace.history_root = str(root / "runs")
            task_run = TaskRun(task=task)
            asyncio.run(run_task(task_run, workspace, workspace.resolve_agent(), "run", 0))
            output = root / "runs" / "run" / "01-task" / "output.md"
            self.assertEqual(task_run.status, TaskStatus.FAILED)
            self.assertIn("- Status: failed", output.read_text())
            self.assertIn("status: needs-rework", task_file.read_text())
            self.assertNotIn("execution_state:", task_file.read_text())

    def test_valid_output_updates_local_lifecycle(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            task_file = root / "task.md"
            task_file.write_text("---\nid: task\ntitle: Task\nstatus: open\n---\nDo work\n")
            agent_script = root / "agent.py"
            agent_script.write_text("""#!/usr/bin/env python3
import pathlib
import re
import sys
instruction = sys.argv[1]
prompt_path = re.search(r"from (.+)\\. Follow", instruction).group(1)
prompt = pathlib.Path(prompt_path).read_text()
output_path = re.search(r"Mandatory output file:\\n(.+)", prompt).group(1).strip()
pathlib.Path(output_path).write_text('''# Workspace AI Runner Output

- Status: success
- Mode: centralized-workspace
- Task: task
- Repositories: none
- Result: implemented
- Validation: passed
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: none
''')
""")
            agent_script.chmod(0o755)
            task = make_task("task")
            task.file_path = str(task_file)
            workspace = load_workspace_from_data({"name": "test", "agents": {"fake": {"command": str(agent_script)}}, "defaultAgent": "fake"}, directory)
            workspace.history_root = str(root / "runs")
            task_run = TaskRun(task=task)
            asyncio.run(run_task(task_run, workspace, workspace.resolve_agent(), "run", 0))
            self.assertEqual(task_run.status, TaskStatus.SUCCESS)
            self.assertIn("status: implemented", task_file.read_text())
            self.assertIn("execution_state: testing", task_file.read_text())

    def test_codex_adapter_materializes_structured_output_and_actual_usage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            task_file = root / "task.md"
            task_file.write_text("---\nid: task\ntitle: Task\nstatus: open\nexecution_profile: mechanical\n---\nDo work\n")
            codex_script = root / "fake_codex.py"
            codex_script.write_text("""#!/usr/bin/env python3
import json
import pathlib
import sys
args = sys.argv[1:]
response_path = pathlib.Path(args[args.index('--output-last-message') + 1])
prompt = sys.stdin.read()
assert 'Do work' in prompt
response_path.write_text(json.dumps({'tasks': [{
    'task': 'task', 'status': 'success', 'repositories': 'none',
    'result': 'implemented', 'validation': 'passed', 'docs_updated': 'none',
    'gaps': 'none', 'needs_rework': 'no', 'notes': 'none'
}]}))
print(json.dumps({'type': 'thread.started', 'thread_id': 'thread-123'}))
print(json.dumps({'type': 'turn.completed', 'usage': {
    'input_tokens': 120, 'cached_input_tokens': 80,
    'output_tokens': 30, 'reasoning_output_tokens': 10
}}))
""")
            codex_script.chmod(0o755)
            task = make_task("task")
            task.file_path = str(task_file)
            task.body = "Do work"
            task.execution_profile = "mechanical"
            workspace = load_workspace_from_data({
                "name": "test", "defaultAgent": "codex",
                "agents": {"codex": {"type": "codex", "command": str(codex_script)}},
            }, directory)
            workspace.history_root = str(root / "runs")
            task_run = TaskRun(task=task)

            asyncio.run(run_task(task_run, workspace, workspace.resolve_agent(), "codex-run", 0))

            stage = root / "runs" / "codex-run" / "01-task"
            summary = json.loads((stage / "summary.json").read_text())
            self.assertEqual(task_run.status, TaskStatus.SUCCESS)
            self.assertEqual(summary["agent"]["model"], "gpt-5.6-luna")
            self.assertEqual(summary["usage"]["inputTokens"], 120)
            self.assertEqual(summary["usage"]["cachedInputTokens"], 80)
            self.assertFalse(summary["usage"]["estimated"])
            self.assertEqual(summary["codex"]["threadId"], "thread-123")
            self.assertEqual(summary["routing"]["selectedModel"], "gpt-5.6-luna")
            self.assertEqual(summary["routing"]["modelSource"], "task")
            self.assertTrue((stage / "codex-events.jsonl").is_file())
            self.assertTrue((stage / "codex-prompt.md").is_file())
            self.assertIn("- Status: success", (stage / "output.md").read_text())
            totals = usage_summary(workspace.config_dir)
            self.assertEqual(totals["measured_runs"], 1)
            self.assertEqual(totals["cached_input_tokens"], 80)


class SchedulingTests(unittest.IsolatedAsyncioTestCase):
    async def test_routes_each_task_to_its_declared_agent(self):
        first = make_task("first")
        second = make_task("second")
        first.execution_agent = "codex"
        second.execution_agent = "claude-code"
        first.routing_policy = second.routing_policy = "preferred"
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({
                "name": "test", "defaultAgent": "codex",
                "agents": {
                    "codex": {"type": "codex", "command": "codex"},
                    "claude-code": {"command": "claude", "model": "claude-model"},
                },
            }, directory)
            routed = {}

            async def fake_run(task_run, _workspace, agent, *_args):
                routed[task_run.task.id] = agent.name
                task_run.status = TaskStatus.SUCCESS

            with patch("runners.generic.runner.run_task", fake_run):
                run = await execute(workspace, [first, second], concurrency=2, run_id="mixed-agents")
        self.assertEqual(routed, {"first": "codex", "second": "claude-code"})
        self.assertIsNone(run.agent)

    async def test_pinned_agent_requires_explicit_override_permission(self):
        task = make_task("task")
        task.execution_agent = "codex"
        task.routing_policy = "pinned"
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({
                "name": "test", "defaultAgent": "codex",
                "agents": {
                    "codex": {"type": "codex", "command": "codex"},
                    "other": {"command": "other"},
                },
            }, directory)
            override = workspace.resolve_agent("other")
            with self.assertRaisesRegex(ValueError, "allow-agent-override"):
                await execute(workspace, [task], concurrency=1, agent=override, run_id="blocked-override")

            used = []

            async def fake_run(task_run, _workspace, agent, *_args):
                used.append((agent.name, task_run.routing["agentSource"]))
                task_run.status = TaskStatus.SUCCESS

            with patch("runners.generic.runner.run_task", fake_run):
                await execute(
                    workspace, [task], concurrency=1, agent=override,
                    allow_agent_override=True, run_id="forced-override",
                )
        self.assertEqual(used, [("other", "forced-cli")])

    def test_preferred_missing_agent_falls_back_to_workspace_default(self):
        task = make_task("task")
        task.execution_agent = "removed-agent"
        task.routing_policy = "preferred"
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({
                "name": "test", "defaultAgent": "fallback",
                "agents": {"fallback": {"command": "fallback"}},
            }, directory)
            decision = resolve_task_agent(workspace, task)
        self.assertEqual(decision.agent.name, "fallback")
        self.assertEqual(decision.source, "workspace-default")
        self.assertIn("unavailable", decision.fallback_reason)

    async def test_does_not_batch_tasks_resolved_to_different_agents(self):
        first = make_task("first")
        second = make_task("second")
        first.execution_agent = "one"
        second.execution_agent = "two"
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({
                "name": "test", "defaultAgent": "one",
                "agents": {"one": {"command": "one"}, "two": {"command": "two"}},
                "tokenPolicy": {"batchRelatedTasks": True, "batchSize": 3},
            }, directory)
            singles = []
            batches = []

            async def fake_run(task_run, _workspace, agent, *_args):
                singles.append((task_run.task.id, agent.name))
                task_run.status = TaskStatus.SUCCESS

            async def fake_batch(task_runs, *_args):
                batches.append([item.task.id for item in task_runs])

            with patch("runners.generic.runner.run_task", fake_run), patch("runners.generic.runner.run_task_batch", fake_batch):
                await execute(workspace, [first, second], concurrency=2, run_id="separate-agent-batches")
        self.assertCountEqual(singles, [("first", "one"), ("second", "two")])
        self.assertEqual(batches, [])

    async def test_serializes_tasks_that_share_a_repository(self):
        first = make_task("first")
        second = make_task("second")
        first.repositories = ["shared"]
        second.repositories = ["shared"]
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({"name": "test", "agents": {"fake": {"command": "fake"}}, "defaultAgent": "fake"}, directory)
            active = 0
            maximum = 0

            async def fake_run(task_run, *_args):
                nonlocal active, maximum
                task_run.status = TaskStatus.RUNNING
                active += 1
                maximum = max(maximum, active)
                await asyncio.sleep(0.01)
                active -= 1
                task_run.status = TaskStatus.SUCCESS

            with patch("runners.generic.runner.run_task", fake_run):
                await execute(workspace, [first, second], concurrency=2, run_id="shared-repo")
        self.assertEqual(maximum, 1)

    async def test_rejects_non_positive_concurrency(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({"name": "test", "agents": {"fake": {"command": "fake"}}, "defaultAgent": "fake"}, directory)
            with self.assertRaisesRegex(ValueError, "between"):
                await execute(workspace, [make_task("task")], concurrency=-1, run_id="invalid")

    async def test_marks_dependency_cycles_as_skipped(self):
        first = make_task("first", ["second"])
        second = make_task("second", ["first"])
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({"name": "test", "agents": {"fake": {"command": "fake"}}, "defaultAgent": "fake"}, directory)
            run = await execute(workspace, [first, second], concurrency=2, run_id="cycle")
        self.assertEqual(run.tasks["first"].status, TaskStatus.SKIPPED)
        self.assertIn("cycle", run.tasks["first"].error)

    async def test_batches_related_tasks_when_enabled(self):
        first = make_task("first")
        second = make_task("second")
        first.repositories = ["shared"]
        second.repositories = ["shared"]
        with tempfile.TemporaryDirectory() as directory:
            workspace = load_workspace_from_data({"name": "test", "agents": {"fake": {"command": "fake"}}, "defaultAgent": "fake"}, directory)
            workspace.token_policy = TokenPolicy(batch_related_tasks=True, batch_size=3)
            batches = []

            async def fake_batch(task_runs, *_args):
                batches.append([task_run.task.id for task_run in task_runs])
                for task_run in task_runs:
                    task_run.status = TaskStatus.SUCCESS

            with patch("runners.generic.runner.run_task_batch", fake_batch):
                await execute(workspace, [first, second], concurrency=2, run_id="related-batch")
        self.assertEqual(batches, [["first", "second"]])

    async def test_related_batch_uses_one_agent_process_and_two_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            counter = root / "invocations.txt"
            agent_script = root / "batch_agent.py"
            agent_script.write_text("""#!/usr/bin/env python3
import pathlib
import re
import sys
instruction = sys.argv[1]
prompt_path = re.search(r"from (.+)\\. Write", instruction).group(1)
prompt = pathlib.Path(prompt_path).read_text()
counter = pathlib.Path(prompt_path).parents[3] / "invocations.txt"
counter.write_text(counter.read_text() + "1\\n" if counter.exists() else "1\\n")
for task_id, output in re.findall(r"## Task ([^\\n]+)[\\s\\S]*?Output: ([^\\n]+)", prompt):
    pathlib.Path(output.strip()).write_text(f'''# Workspace AI Runner Output

- Status: success
- Mode: centralized-workspace
- Task: {task_id}
- Repositories: none
- Result: implemented
- Validation: passed
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: none
''')
""")
            agent_script.chmod(0o755)
            workspace = self._batch_workspace(root, agent_script)
            tasks = []
            for task_id in ("first", "second"):
                task_file = root / f"{task_id}.md"
                task_file.write_text(f"---\nid: {task_id}\ntitle: {task_id}\nstatus: open\n---\nDo {task_id}\n")
                task = make_task(task_id)
                task.file_path = str(task_file)
                task.body = f"Do {task_id}"
                tasks.append(task)
            run = await execute(workspace, tasks, concurrency=2, run_id="real-related-batch")
            self.assertEqual(run.tasks["first"].status, TaskStatus.SUCCESS)
            self.assertEqual(run.tasks["second"].status, TaskStatus.SUCCESS)
            self.assertEqual(counter.read_text().splitlines(), ["1"])

    async def test_codex_batch_uses_one_structured_turn_for_matching_tiers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            counter = root / "codex-invocations.txt"
            agent_script = root / "codex_batch.py"
            agent_script.write_text("""#!/usr/bin/env python3
import json
import pathlib
import sys
args = sys.argv[1:]
response_path = pathlib.Path(args[args.index('--output-last-message') + 1])
counter = response_path.parents[3] / 'codex-invocations.txt'
counter.write_text(counter.read_text() + '1\\n' if counter.exists() else '1\\n')
prompt = sys.stdin.read()
assert 'Do first' in prompt and 'Do second' in prompt
response_path.write_text(json.dumps({'tasks': [
    {'task': task, 'status': 'success', 'repositories': 'none', 'result': 'implemented',
     'validation': 'passed', 'docs_updated': 'none', 'gaps': 'none',
     'needs_rework': 'no', 'notes': 'none'}
    for task in ('first', 'second')
]}))
print(json.dumps({'type': 'thread.started', 'thread_id': 'batch-thread'}))
print(json.dumps({'type': 'turn.completed', 'usage': {
    'input_tokens': 200, 'cached_input_tokens': 100, 'output_tokens': 40,
    'reasoning_output_tokens': 20
}}))
""")
            agent_script.chmod(0o755)
            workspace = WorkspaceConfig(
                name="test", config_path=str(root / "workspace.config.json"), config_dir=str(root),
                sdd_root=str(root), tasks_dir=str(root), history_root=str(root / "runs"), skills_dir=str(root / "skills"),
                agents={"codex": AgentConfig(name="codex", type="codex", command=str(agent_script), codex=CodexOptions())},
                default_agent="codex", token_policy=TokenPolicy(batch_related_tasks=True, batch_size=3),
            )
            tasks = []
            for task_id in ("first", "second"):
                task_file = root / f"{task_id}.md"
                task_file.write_text(f"---\nid: {task_id}\ntitle: {task_id}\nstatus: open\nexecution_profile: mechanical\n---\nDo {task_id}\n")
                task = make_task(task_id)
                task.file_path = str(task_file)
                task.body = f"Do {task_id}"
                task.execution_profile = "mechanical"
                tasks.append(task)

            run = await execute(workspace, tasks, concurrency=2, run_id="codex-related-batch")

            self.assertEqual(run.tasks["first"].status, TaskStatus.SUCCESS)
            self.assertEqual(run.tasks["second"].status, TaskStatus.SUCCESS)
            self.assertEqual(counter.read_text().splitlines(), ["1"])
            first_summary = json.loads((root / "runs" / "codex-related-batch" / "01-first" / "summary.json").read_text())
            self.assertEqual(first_summary["usage"]["batchActualInputTokens"], 200)
            self.assertEqual(first_summary["agent"]["model"], "gpt-5.6-luna")

    @staticmethod
    def _batch_workspace(root: Path, agent_script: Path) -> WorkspaceConfig:
        return WorkspaceConfig(
            name="test", config_path=str(root / "workspace.config.json"), config_dir=str(root),
            sdd_root=str(root), tasks_dir=str(root), history_root=str(root / "runs"), skills_dir=str(root / "skills"),
            agents={"fake": AgentConfig(name="fake", command=str(agent_script))}, default_agent="fake",
            token_policy=TokenPolicy(batch_related_tasks=True, batch_size=3),
        )


class TokenEconomyTests(unittest.TestCase):
    def _workspace(self, directory: str, repositories: list[Repository] | None = None) -> WorkspaceConfig:
        root = Path(directory)
        return WorkspaceConfig(
            name="test", config_path=str(root / "workspace.config.json"), config_dir=str(root),
            sdd_root=str(root / "sdd"), tasks_dir=str(root / "sdd" / "tasks"),
            history_root=str(root / "runs"), skills_dir=str(root / "skills"),
            repositories=repositories or [], agents={"fake": AgentConfig(name="fake", command="fake")},
            default_agent="fake", token_policy=TokenPolicy(context_budget_tokens=100),
        )

    def test_prompt_contains_task_body_once_for_multiple_repositories(self):
        with tempfile.TemporaryDirectory() as directory:
            repos = [
                Repository(id="one", label="One", root=str(Path(directory) / "one")),
                Repository(id="two", label="Two", root=str(Path(directory) / "two")),
            ]
            workspace = self._workspace(directory, repos)
            task = make_task("task")
            task.repositories = ["one", "two"]
            task.body = "UNIQUE SPECIFICATION BODY"
            prompt = build_prompt(task, workspace, str(Path(directory) / "output.md"))
        self.assertEqual(prompt.count("UNIQUE SPECIFICATION BODY"), 1)

    def test_context_cache_respects_budget_and_records_hit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            task_file = root / "task.md"
            task_file.write_text("---\nid: task\ntitle: Task\nstatus: open\n---\nUse contracts\n")
            task_file.with_suffix(".context.md").write_text("# Contract\n\n" + ("contract detail line\n" * 300))
            task = make_task("task")
            task.file_path = str(task_file)
            task.body = "Use contract detail"
            workspace = self._workspace(directory)
            first = assemble_context(task, workspace, 100)
            second = assemble_context(task, workspace, 100)
            self.assertLessEqual(first.included_tokens, 110)
            self.assertEqual(first.cache_misses, 1)
            self.assertEqual(second.cache_hits, 1)
            self.assertTrue(first.truncated)
            self.assertTrue(Path(first.cache_path).is_file())
            self.assertEqual(usage_summary(directory)["runs"], 0)


if __name__ == "__main__":
    unittest.main()
