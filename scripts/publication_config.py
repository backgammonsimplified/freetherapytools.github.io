from __future__ import annotations

import os
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLICATION_PATH = REPO_ROOT / "site" / "_publication.yml"
LEGACY_DISPOSITIONS_PATH = REPO_ROOT / "site" / "legacy-dispositions.yml"


def _mapping(value: object, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RuntimeError(f"{label} must be a mapping")
    return value


def _nonempty_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"{label} must be a non-empty string")
    return value.strip()


def _load_yaml(path: Path) -> Mapping[str, Any]:
    try:
        parsed = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as error:
        raise RuntimeError(f"Could not load publication configuration: {path}") from error
    return _mapping(parsed, str(path))


def load_publication_identity(path: Path = PUBLICATION_PATH) -> dict[str, Any]:
    document = _load_yaml(path)
    website = _mapping(document.get("website"), "website")
    publication = dict(
        _mapping(document.get("bs-publication"), "bs-publication")
    )
    name = _nonempty_string(publication.get("name"), "bs-publication.name")
    origin = _nonempty_string(
        publication.get("canonical-origin"),
        "bs-publication.canonical-origin",
    ).rstrip("/")
    if website.get("title") != name:
        raise RuntimeError("website.title must match bs-publication.name")
    if str(website.get("site-url", "")).rstrip("/") != origin:
        raise RuntimeError(
            "website.site-url must match bs-publication.canonical-origin"
        )
    publication["name"] = name
    publication["canonical-origin"] = origin
    _nonempty_string(publication.get("acronym"), "bs-publication.acronym")
    _nonempty_string(publication.get("schema-id"), "bs-publication.schema-id")
    indexing = _mapping(publication.get("indexing"), "bs-publication.indexing")
    modes = _mapping(indexing.get("modes"), "bs-publication.indexing.modes")
    for mode in ("development", "production"):
        config = _mapping(modes.get(mode), f"indexing mode {mode}")
        _nonempty_string(config.get("robots-meta"), f"{mode}.robots-meta")
        robots = config.get("robots-txt")
        if not isinstance(robots, list) or not robots:
            raise RuntimeError(f"{mode}.robots-txt must be a non-empty list")
        for index, line in enumerate(robots):
            _nonempty_string(line, f"{mode}.robots-txt[{index}]")
    return publication


def publication_mode(
    publication: Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> tuple[str, Mapping[str, Any]]:
    indexing = _mapping(publication.get("indexing"), "bs-publication.indexing")
    variable = _nonempty_string(
        indexing.get("environment-variable"),
        "indexing.environment-variable",
    )
    default = _nonempty_string(indexing.get("default-mode"), "indexing.default-mode")
    selected_environ = os.environ if environ is None else environ
    selected = selected_environ.get(variable, default).strip().lower()
    modes = _mapping(indexing.get("modes"), "indexing.modes")
    if selected not in modes:
        supported = ", ".join(sorted(str(mode) for mode in modes))
        raise RuntimeError(
            f"Unsupported {variable}={selected!r}; expected one of: {supported}"
        )
    return selected, _mapping(modes[selected], f"indexing mode {selected}")


def load_legacy_dispositions(
    publication: Mapping[str, Any],
    path: Path = LEGACY_DISPOSITIONS_PATH,
) -> dict[str, Any]:
    document = _load_yaml(path)
    registry = dict(
        _mapping(document.get("legacy-dispositions"), "legacy-dispositions")
    )
    origin = _nonempty_string(
        registry.get("canonical-origin"),
        "legacy-dispositions.canonical-origin",
    ).rstrip("/")
    if origin != publication["canonical-origin"]:
        raise RuntimeError(
            "legacy-dispositions canonical origin must match publication identity"
        )
    hosts = registry.get("hosts")
    routes = registry.get("routes")
    if not isinstance(hosts, list) or not hosts:
        raise RuntimeError("legacy-dispositions.hosts must be a non-empty list")
    if not isinstance(routes, list) or not routes:
        raise RuntimeError("legacy-dispositions.routes must be a non-empty list")
    for index, host in enumerate(hosts):
        host = _mapping(host, f"legacy host {index}")
        legacy_origin = _nonempty_string(host.get("origin"), f"legacy host {index}.origin")
        if legacy_origin.rstrip("/") == origin or host.get("canonical") is not False:
            raise RuntimeError("legacy hosts must be non-canonical and differ from origin")
    for index, route in enumerate(routes):
        route = _mapping(route, f"legacy route {index}")
        source = _nonempty_string(route.get("source"), f"legacy route {index}.source")
        target = _nonempty_string(route.get("target"), f"legacy route {index}.target")
        if not source.startswith("/") or not target.startswith("/"):
            raise RuntimeError("legacy route source and target must be root-relative")
        if source == target or route.get("canonical") is not False:
            raise RuntimeError("legacy routes must redirect to a distinct canonical route")
    return registry
