"""SQLite/FTS5 cache for budgeted workspace execution context."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

from .token_usage import estimate_tokens, truncate_to_token_budget

ANALYZER_VERSION = "markdown-v1"
POLICY_VERSION = "compact-v1"
MANIFEST_MARKER = "<!-- ws-runner-context-manifest:v1 -->"


@dataclass
class ContextAssembly:
    content: str
    source_tokens: int
    included_tokens: int
    cache_hits: int
    cache_misses: int
    fingerprint: str
    unit_ids: list[int]
    truncated: bool
    cache_path: str

    def as_dict(self) -> dict:
        return {
            "content": self.content,
            "sourceTokens": self.source_tokens,
            "includedTokens": self.included_tokens,
            "cacheHits": self.cache_hits,
            "cacheMisses": self.cache_misses,
            "fingerprint": self.fingerprint,
            "unitIds": self.unit_ids,
            "truncated": self.truncated,
            "cachePath": self.cache_path,
        }


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def cache_path_for_workspace(config_dir: str) -> Path:
    path = Path(config_dir) / "cache" / "context.sqlite"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect_cache(config_dir: str) -> sqlite3.Connection:
    cache_path = cache_path_for_workspace(config_dir)
    connection = sqlite3.connect(cache_path, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.executescript("""
        CREATE TABLE IF NOT EXISTS knowledge_units (
            id INTEGER PRIMARY KEY,
            workspace TEXT NOT NULL,
            task_id TEXT NOT NULL,
            repository TEXT NOT NULL,
            commit_sha TEXT NOT NULL,
            file_path TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            symbol TEXT NOT NULL,
            summary TEXT NOT NULL,
            excerpt TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            analyzer_version TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(workspace, task_id, content_hash, analyzer_version)
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_units_fts USING fts5(
            task_id, repository, symbol, summary, excerpt,
            content='knowledge_units', content_rowid='id'
        );
        CREATE TRIGGER IF NOT EXISTS knowledge_units_ai AFTER INSERT ON knowledge_units BEGIN
            INSERT INTO knowledge_units_fts(rowid, task_id, repository, symbol, summary, excerpt)
            VALUES (new.id, new.task_id, new.repository, new.symbol, new.summary, new.excerpt);
        END;
        CREATE TRIGGER IF NOT EXISTS knowledge_units_ad AFTER DELETE ON knowledge_units BEGIN
            INSERT INTO knowledge_units_fts(knowledge_units_fts, rowid, task_id, repository, symbol, summary, excerpt)
            VALUES ('delete', old.id, old.task_id, old.repository, old.symbol, old.summary, old.excerpt);
        END;
        CREATE TABLE IF NOT EXISTS task_contexts (
            task_id TEXT NOT NULL,
            fingerprint TEXT NOT NULL,
            manifest_json TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(task_id, fingerprint)
        );
        CREATE TABLE IF NOT EXISTS policy_cache (
            policy_version TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            compact_policy TEXT NOT NULL,
            token_count INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(policy_version, content_hash)
        );
        CREATE TABLE IF NOT EXISTS run_usage (
            run_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            cached_input_tokens INTEGER NOT NULL DEFAULT 0,
            reasoning_output_tokens INTEGER NOT NULL DEFAULT 0,
            cached_tokens INTEGER NOT NULL DEFAULT 0,
            context_tokens INTEGER NOT NULL DEFAULT 0,
            diff_tokens INTEGER NOT NULL DEFAULT 0,
            cache_hits INTEGER NOT NULL DEFAULT 0,
            cache_misses INTEGER NOT NULL DEFAULT 0,
            estimated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            PRIMARY KEY(run_id, task_id)
        );
    """)
    existing_columns = {row[1] for row in connection.execute("PRAGMA table_info(run_usage)")}
    if "cached_input_tokens" not in existing_columns:
        connection.execute("ALTER TABLE run_usage ADD COLUMN cached_input_tokens INTEGER NOT NULL DEFAULT 0")
    if "reasoning_output_tokens" not in existing_columns:
        connection.execute("ALTER TABLE run_usage ADD COLUMN reasoning_output_tokens INTEGER NOT NULL DEFAULT 0")
    return connection


def _repo_head(root: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", root, "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except (OSError, subprocess.TimeoutExpired):
        return "unknown"


def repository_fingerprint(repositories: Iterable) -> str:
    parts = [f"{repo.id}:{_repo_head(repo.root)}" for repo in repositories]
    return _hash("\n".join(parts)) if parts else "none"


def _split_markdown(content: str) -> list[tuple[str, str]]:
    units: list[tuple[str, str]] = []
    heading = "Context"
    buffer: list[str] = []
    for line in content.splitlines():
        if line.startswith("#") and re.match(r"^#{1,6}\s+", line):
            if any(part.strip() for part in buffer):
                units.append((heading, "\n".join(buffer).strip()))
            heading = re.sub(r"^#{1,6}\s+", "", line).strip()
            buffer = [line]
        else:
            buffer.append(line)
    if any(part.strip() for part in buffer):
        units.append((heading, "\n".join(buffer).strip()))

    expanded: list[tuple[str, str]] = []
    for symbol, excerpt in units:
        if estimate_tokens(excerpt) <= 900:
            expanded.append((symbol, excerpt))
            continue
        paragraphs = re.split(r"\n\s*\n", excerpt)
        current: list[str] = []
        for paragraph in paragraphs:
            candidate = "\n\n".join([*current, paragraph]).strip()
            if current and estimate_tokens(candidate) > 900:
                expanded.append((symbol, "\n\n".join(current).strip()))
                current = [paragraph]
            else:
                current.append(paragraph)
        if current:
            expanded.append((symbol, "\n\n".join(current).strip()))
    return [(symbol, excerpt) for symbol, excerpt in expanded if excerpt]


def _read_context_source(context_path: Path, workspace) -> str:
    content = context_path.read_text().strip()
    if not content.startswith(MANIFEST_MARKER):
        return content
    try:
        manifest = json.loads(content[len(MANIFEST_MARKER):].strip())
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid context manifest {context_path}: {error}") from error
    source_value = manifest.get("sourcePath")
    if not isinstance(source_value, str) or not source_value:
        raise ValueError(f"Context manifest {context_path} is missing sourcePath.")
    base = Path(workspace.config_dir).resolve()
    source_path = (base / source_value).resolve()
    if source_path != base and base not in source_path.parents:
        raise ValueError(f"Context manifest source escapes workspace: {source_path}")
    if not source_path.is_file():
        raise ValueError(f"Context manifest source does not exist: {source_path}")
    source = source_path.read_text().strip()
    expected_hash = manifest.get("contentHash")
    if expected_hash and _hash(source) != expected_hash:
        raise ValueError(f"Context manifest source hash mismatch: {source_path}")
    return source


def _fts_query(value: str) -> str:
    words = re.findall(r"[A-Za-z0-9_][A-Za-z0-9_.-]{1,}", value.lower())
    unique = list(dict.fromkeys(words))[:24]
    return " OR ".join(f'"{word.replace(chr(34), "")}"' for word in unique)


def assemble_context(task, workspace, max_tokens: int, query: Optional[str] = None) -> ContextAssembly:
    context_path = Path(task.file_path).with_suffix(".context.md")
    cache_path = cache_path_for_workspace(workspace.config_dir)
    if not context_path.is_file() or not context_path.read_text().strip():
        return ContextAssembly("", 0, 0, 0, 0, "none", [], False, str(cache_path))

    source = _read_context_source(context_path, workspace)
    repo_map = {repo.id: repo for repo in workspace.repositories}
    selected_repos = [repo_map[repo_id] for repo_id in task.repositories if repo_id in repo_map]
    repo_sha = repository_fingerprint(selected_repos)
    fingerprint = _hash("\n".join([source, repo_sha, ANALYZER_VERSION]))
    units = _split_markdown(source)
    connection = connect_cache(workspace.config_dir)
    try:
        existing = connection.execute(
            "SELECT manifest_json FROM task_contexts WHERE task_id = ? AND fingerprint = ?",
            (task.id, fingerprint),
        ).fetchone()
        cache_hits = 1 if existing else 0
        cache_misses = 0 if existing else 1
        if not existing:
            connection.execute("DELETE FROM knowledge_units WHERE workspace = ? AND task_id = ?", (workspace.name, task.id))
            connection.execute("DELETE FROM task_contexts WHERE task_id = ? AND fingerprint <> ?", (task.id, fingerprint))
            repository_value = ",".join(task.repositories)
            unit_ids: list[int] = []
            for unit_index, (symbol, excerpt) in enumerate(units):
                summary = next((line.strip("# ") for line in excerpt.splitlines() if line.strip()), symbol)[:240]
                cursor = connection.execute("""
                    INSERT INTO knowledge_units(
                        workspace, task_id, repository, commit_sha, file_path, content_hash,
                        symbol, summary, excerpt, token_count, analyzer_version, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    workspace.name, task.id, repository_value, repo_sha, str(context_path), _hash(f"{unit_index}:{excerpt}"),
                    symbol, summary, excerpt, estimate_tokens(excerpt), ANALYZER_VERSION, _now(),
                ))
                unit_ids.append(cursor.lastrowid)
            manifest = {"version": 1, "fingerprint": fingerprint, "unitIds": unit_ids, "source": str(context_path)}
            connection.execute(
                "INSERT OR REPLACE INTO task_contexts(task_id, fingerprint, manifest_json, token_count, created_at) VALUES (?, ?, ?, ?, ?)",
                (task.id, fingerprint, json.dumps(manifest), estimate_tokens(source), _now()),
            )
            connection.commit()

        search = _fts_query(query or f"{task.title}\n{task.body}\n{' '.join(task.repositories)}")
        if search:
            rows = connection.execute("""
                SELECT k.*, bm25(knowledge_units_fts) AS rank
                FROM knowledge_units_fts
                JOIN knowledge_units k ON k.id = knowledge_units_fts.rowid
                WHERE knowledge_units_fts MATCH ? AND k.workspace = ? AND k.task_id = ?
                ORDER BY rank, k.id
            """, (search, workspace.name, task.id)).fetchall()
        else:
            rows = []
        all_rows = connection.execute(
            "SELECT * FROM knowledge_units WHERE workspace = ? AND task_id = ? ORDER BY id",
            (workspace.name, task.id),
        ).fetchall()
        selected_row_ids = {row["id"] for row in rows}
        rows = [*rows, *(row for row in all_rows if row["id"] not in selected_row_ids)]

        selected: list[str] = []
        selected_ids: list[int] = []
        remaining = max_tokens
        truncated = False
        for row in rows:
            excerpt = row["excerpt"]
            tokens = estimate_tokens(excerpt)
            if tokens <= remaining:
                selected.append(excerpt)
                selected_ids.append(row["id"])
                remaining -= tokens
            elif remaining >= 80:
                partial, _ = truncate_to_token_budget(excerpt, remaining)
                selected.append(partial.rstrip() + "\n\n[context unit truncated]")
                selected_ids.append(row["id"])
                remaining = 0
                truncated = True
            else:
                truncated = True
            if remaining < 80:
                break
        content = "\n\n---\n\n".join(selected)
        return ContextAssembly(
            content=content,
            source_tokens=estimate_tokens(source),
            included_tokens=estimate_tokens(content),
            cache_hits=cache_hits,
            cache_misses=cache_misses,
            fingerprint=fingerprint,
            unit_ids=selected_ids,
            truncated=truncated or estimate_tokens(content) < estimate_tokens(source),
            cache_path=str(cache_path),
        )
    finally:
        connection.close()


def cache_policy(config_dir: str, policy: str) -> dict:
    connection = connect_cache(config_dir)
    content_hash = _hash(policy)
    try:
        connection.execute(
            "INSERT OR IGNORE INTO policy_cache(policy_version, content_hash, compact_policy, token_count, created_at) VALUES (?, ?, ?, ?, ?)",
            (POLICY_VERSION, content_hash, policy, estimate_tokens(policy), _now()),
        )
        connection.commit()
    finally:
        connection.close()
    return {"policyVersion": POLICY_VERSION, "contentHash": content_hash, "tokens": estimate_tokens(policy)}


def record_run_usage(config_dir: str, run_id: str, task_id: str, usage: dict) -> None:
    connection = connect_cache(config_dir)
    try:
        connection.execute("""
            INSERT OR REPLACE INTO run_usage(
                run_id, task_id, input_tokens, output_tokens, cached_input_tokens,
                reasoning_output_tokens, cached_tokens, context_tokens,
                diff_tokens, cache_hits, cache_misses, estimated, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id, task_id, usage.get("inputTokens", 0), usage.get("outputTokens", 0),
            usage.get("cachedInputTokens", 0), usage.get("reasoningOutputTokens", 0),
            usage.get("cachedTokens", 0), usage.get("contextTokens", 0), usage.get("diffTokens", 0),
            usage.get("cacheHits", 0), usage.get("cacheMisses", 0),
            1 if usage.get("estimated", True) else 0, _now(),
        ))
        connection.commit()
    finally:
        connection.close()


def usage_summary(config_dir: str) -> dict:
    connection = connect_cache(config_dir)
    try:
        row = connection.execute("""
            SELECT COUNT(*) AS runs, COALESCE(SUM(input_tokens), 0) AS input_tokens,
                   COALESCE(SUM(output_tokens), 0) AS output_tokens,
                   COALESCE(SUM(cached_input_tokens), 0) AS cached_input_tokens,
                   COALESCE(SUM(reasoning_output_tokens), 0) AS reasoning_output_tokens,
                   COALESCE(SUM(cached_tokens), 0) AS cached_tokens,
                   COALESCE(SUM(context_tokens), 0) AS context_tokens,
                   COALESCE(SUM(diff_tokens), 0) AS diff_tokens,
                   COALESCE(SUM(cache_hits), 0) AS cache_hits,
                   COALESCE(SUM(cache_misses), 0) AS cache_misses,
                   COALESCE(SUM(CASE WHEN estimated = 0 THEN 1 ELSE 0 END), 0) AS measured_runs,
                   COALESCE(SUM(CASE WHEN estimated = 1 THEN 1 ELSE 0 END), 0) AS estimated_runs
            FROM run_usage
        """).fetchone()
        return dict(row)
    finally:
        connection.close()


def _cli() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["usage", "assemble"])
    parser.add_argument("--config-dir")
    parser.add_argument("--config")
    parser.add_argument("--task")
    parser.add_argument("--max-tokens", type=int, default=4000)
    args = parser.parse_args()
    if args.command == "usage":
        if not args.config_dir:
            parser.error("usage requires --config-dir")
        print(json.dumps(usage_summary(args.config_dir)))
        return
    if not args.config or not args.task:
        parser.error("assemble requires --config and --task")
    from .config import load_tasks, load_workspace
    workspace = load_workspace(args.config)
    matches = [task for task in load_tasks(workspace) if task.id == args.task or task.file_name == args.task]
    if len(matches) != 1:
        raise SystemExit(f"Task '{args.task}' did not resolve uniquely.")
    print(json.dumps(assemble_context(matches[0], workspace, args.max_tokens).as_dict()))


if __name__ == "__main__":
    _cli()
