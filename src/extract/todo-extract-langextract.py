#!/usr/bin/env python3
"""LangExtract sidecar for AI-Todo card extraction."""

from __future__ import annotations

import json
import os
import sys
import textwrap

DEFAULT_MODEL = "deepseek/deepseek-v4-flash"
DEFAULT_PROVIDER = "openai"
DEFAULT_ENDPOINT = "https://api.novita.ai/openai/v1"

PROMPT = textwrap.dedent(
    """\
    Extract mature, user-facing todo cards from AI agent session text.
    Extract only unresolved, actionable work. Do not extract completed work,
    status reports, tool logs, raw command payloads, or generic process checks.
    The generated card must read like a mature todo app item, not a transcript
    snippet. Title must be crisp and scannable. Description must be one concise
    sentence about the remaining user-relevant work.
    Preserve technical identifiers in the description when they are long.
    Use exact source text as extraction_text.
    Return fields: title, description, confidence, sourceObservationId, quote,
    dedupeKey. dedupeKey must be stable for the same action regardless of
    wording.
    Prefer "推送当前工作分支到远程仓库" over putting long branch names in title.
    Negative example: source text about "做最后一次状态确认" should produce no todo.
    """
)


def model_id_from_env() -> str:
    return (os.environ.get("AI_TODO_LLM_MODEL") or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def provider_from_env() -> str:
    provider = (os.environ.get("AI_TODO_LLM_PROVIDER") or DEFAULT_PROVIDER).strip().lower()
    return DEFAULT_PROVIDER if provider in ("", "novita", "deepseek") else provider


def endpoint_from_env() -> str:
    return (os.environ.get("AI_TODO_LLM_ENDPOINT") or DEFAULT_ENDPOINT).strip() or DEFAULT_ENDPOINT


def extract_kwargs(lx, model_config_cls=None) -> dict:
    provider = provider_from_env()
    model_id = model_id_from_env()
    api_key = (os.environ.get("AI_TODO_LLM_API_KEY") or "").strip()
    thinking_depth = (os.environ.get("AI_TODO_LLM_THINKING_DEPTH") or "medium").strip()
    if provider == "openai":
        if not api_key:
            raise SystemExit("AI_TODO_LLM_API_KEY is required")
        if model_config_cls is None:
            from langextract.factory import ModelConfig as model_config_cls  # type: ignore
        return {
            "config": model_config_cls(
                model_id=model_id,
                provider="openai",
                provider_kwargs={
                    "api_key": api_key,
                    "base_url": endpoint_from_env(),
                    "reasoning_effort": thinking_depth,
                },
            ),
            "use_schema_constraints": False,
            "extraction_passes": 2,
            "max_workers": 4,
            "max_char_buffer": 1600,
        }
    return {"model_id": model_id}


def main() -> int:
    try:
        import langextract as lx  # type: ignore
    except Exception as exc:
        raise SystemExit(f"langextract unavailable: {exc}") from exc

    payload = json.load(sys.stdin)
    blocks = payload.get("blocks") or []
    text = "\n\n".join(
        f"[obs:{block.get('sourceObservationId','')}]\n{block.get('text','')}"
        for block in blocks
        if isinstance(block, dict) and block.get("text")
    )
    if not text.strip():
        print(json.dumps({"todos": []}, ensure_ascii=False))
        return 0

    examples = [
        lx.data.ExampleData(
            text="[obs:obs_1]\n后续需要修复 CI 失败，并重新跑测试。",
            extractions=[
                lx.data.Extraction(
                    extraction_class="todo",
                    extraction_text="后续需要修复 CI 失败，并重新跑测试",
                    attributes={
                        "title": "修复 CI 失败并重新跑测试",
                        "description": "后续需要修复 CI 失败，并重新跑测试。",
                        "confidence": 0.9,
                        "dedupeKey": "fix-ci-rerun-tests",
                    },
                )
            ],
        ),
        lx.data.ExampleData(
            text="[obs:obs_2]\n下一步需要推送 codex/todo-cleanup-flash-model 分支到远程仓库。",
            extractions=[
                lx.data.Extraction(
                    extraction_class="todo",
                    extraction_text="推送 codex/todo-cleanup-flash-model 分支到远程仓库",
                    attributes={
                        "title": "推送当前工作分支到远程仓库",
                        "description": "推送当前工作分支到远程仓库。分支：codex/todo-cleanup-flash-model。",
                        "confidence": 0.88,
                        "dedupeKey": "push-current-branch",
                    },
                )
            ],
        ),
    ]

    result = lx.extract(
        text_or_documents=text,
        prompt_description=PROMPT,
        examples=examples,
        **extract_kwargs(lx),
    )
    todos = []
    for item in getattr(result, "extractions", []):
        if getattr(item, "extraction_class", "") != "todo":
            continue
        quote = getattr(item, "extraction_text", "") or ""
        attrs = getattr(item, "attributes", {}) or {}
        if not quote or not attrs.get("title"):
            continue
        prefix = text[: text.find(quote)] if quote in text else ""
        obs_id = prefix.rsplit("[obs:", 1)[-1].split("]", 1)[0] if "[obs:" in prefix else ""
        todos.append({
            "title": attrs.get("title"),
            "description": attrs.get("description") or quote,
            "confidence": attrs.get("confidence", 0.6),
            "sourceObservationId": obs_id,
            "quote": quote,
            "dedupeKey": attrs.get("dedupeKey") or "",
        })
    print(json.dumps({"todos": todos}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    if os.environ.get("AI_TODO_LLM_SELF_TEST") == "1":
        os.environ.setdefault("AI_TODO_LLM_API_KEY", "dummy")

        class DummyConfig:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)

        class DummyLx:
            pass

        params = extract_kwargs(DummyLx, DummyConfig)
        config = params["config"]
        assert config.model_id == DEFAULT_MODEL
        assert config.provider == "openai"
        assert config.provider_kwargs["base_url"] == DEFAULT_ENDPOINT
        assert config.provider_kwargs["reasoning_effort"] == "medium"
        assert params["use_schema_constraints"] is False
        assert "mature todo app item" in PROMPT
        assert "做最后一次状态确认" in PROMPT
        assert "推送当前工作分支到远程仓库" in PROMPT
        raise SystemExit(0)
    raise SystemExit(main())
