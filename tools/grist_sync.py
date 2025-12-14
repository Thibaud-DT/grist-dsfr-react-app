#!/usr/bin/env python3
"""
Grist components sync tool (Python)

Usage examples:
  python tools/grist_sync.py push --env dev grist/composants/home
  python tools/grist_sync.py push --env prod --all
  python tools/grist_sync.py diff --env dev grist/composants/home

Config file (default: grist_sync.config.json):
{
  "envs": {
    "dev": {
      "base_url": "https://docs.getgrist.com",
      "doc_id": "your-doc-id",
      "api_key_env": "GRIST_API_KEY_DEV",
      "table_id": "Application_Composants"
    },
    "prod": {
      "base_url": "https://docs.getgrist.com",
      "doc_id": "your-doc-id-prod",
      "api_key_env": "GRIST_API_KEY_PROD",
      "table_id": "Application_Composants"
    }
  },
  "components_dir": "grist/composants"
}
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
  import requests
except ImportError:
  print("Veuillez installer requests : pip install requests", file=sys.stderr)
  sys.exit(1)

CONFIG_DEFAULT = "grist_sync.config.json"
DOTENV_DEFAULT = ".env"


class ConfigError(Exception):
  pass


def load_config(path: str) -> Dict[str, Any]:
  cfg_path = Path(path)
  if not cfg_path.exists():
    raise ConfigError(f"Fichier de config introuvable: {path}")
  with cfg_path.open("r", encoding="utf-8") as f:
    return json.load(f)


def load_dotenv(path: str = DOTENV_DEFAULT) -> None:
  """Lecture simple d'un .env (clé=valeur, sans expansion)."""
  p = Path(path)
  if not p.exists():
    return
  for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
      continue
    if "=" not in line:
      continue
    key, val = line.split("=", 1)
    key = key.strip()
    val = val.strip().strip('"').strip("'")
    if key and key not in os.environ:
      os.environ[key] = val


def get_env_config(cfg: Dict[str, Any], env: str) -> Dict[str, Any]:
  envs = cfg.get("envs") or {}
  if env not in envs:
    raise ConfigError(f"Environnement '{env}' non défini dans la config.")
  env_cfg = envs[env]
  for key in ["base_url", "doc_id", "api_key_env", "table_id"]:
    if key not in env_cfg:
      raise ConfigError(f"Clé manquante '{key}' pour l'environnement '{env}'.")
  api_key = os.environ.get(env_cfg["api_key_env"])
  if not api_key:
    raise ConfigError(f"Variable d'environnement {env_cfg['api_key_env']} non définie.")
  env_cfg["_api_key"] = api_key
  return env_cfg


def list_component_files(components_dir: Path) -> List[Path]:
  return sorted([p for p in components_dir.iterdir() if p.is_file()])


def extract_template_id_from_path(p: Path) -> str:
  # convention : grist/composants/<template_id>
  return p.name


def fetch_component_record(env_cfg: Dict[str, Any], template_id: str) -> Optional[Dict[str, Any]]:
  url = f"{env_cfg['base_url'].rstrip('/')}/api/docs/{env_cfg['doc_id']}/tables/{env_cfg['table_id']}/records"
  params = {f"filter[template_id]": template_id}
  headers = {"Authorization": f"Bearer {env_cfg['_api_key']}"}
  r = requests.get(url, headers=headers, params=params)
  try:
    r.raise_for_status()
  except requests.HTTPError as e:
    msg = f"HTTP {r.status_code} on GET {url}: {r.text}"
    raise requests.HTTPError(msg) from e
  data = r.json()
  recs = data.get("records") or []
  if not recs:
    return None
  if len(recs) > 1:
    print(f"⚠️  Plusieurs enregistrements trouvés pour template_id={template_id}, utilisation du premier.", file=sys.stderr)
  return recs[0]


def push_component(env_cfg: Dict[str, Any], file_path: Path) -> None:
  template_id = extract_template_id_from_path(file_path)
  code = file_path.read_text(encoding="utf-8")
  rec = fetch_component_record(env_cfg, template_id)
  url_base = f"{env_cfg['base_url'].rstrip('/')}/api/docs/{env_cfg['doc_id']}/tables/{env_cfg['table_id']}"
  headers = {
    "Authorization": f"Bearer {env_cfg['_api_key']}",
    "Content-Type": "application/json"
  }
  if rec:
    row_id = rec["id"]
    payload = {"records": [{"id": row_id, "fields": {"component_code": code}}]}
    r = requests.patch(f"{url_base}/records", headers=headers, data=json.dumps(payload))
    try:
      r.raise_for_status()
    except requests.HTTPError as e:
      msg = f"HTTP {r.status_code} on PATCH {url_base}/records: {r.text}"
      raise requests.HTTPError(msg) from e
    print(f"✓ Update {template_id} (row {row_id})")
  else:
    payload = {"records": [{"fields": {"template_id": template_id, "component_code": code}}]}
    r = requests.post(f"{url_base}/records", headers=headers, data=json.dumps(payload))
    try:
      r.raise_for_status()
    except requests.HTTPError as e:
      msg = f"HTTP {r.status_code} on POST {url_base}/records: {r.text}"
      raise requests.HTTPError(msg) from e
    recs = r.json().get("records") or []
    new_id = recs[0]["id"] if recs else "?"
    print(f"✓ Create {template_id} (row {new_id})")


def diff_component(env_cfg: Dict[str, Any], file_path: Path) -> None:
  template_id = extract_template_id_from_path(file_path)
  code_local = file_path.read_text(encoding="utf-8")
  rec = fetch_component_record(env_cfg, template_id)
  if not rec:
    print(f"{template_id}: ❓ non trouvé côté Grist")
    return
  remote = rec.get("fields", {}).get("component_code", "")
  if remote == code_local:
    print(f"{template_id}: identique")
  else:
    print(f"{template_id}: différent")


def main():
  parser = argparse.ArgumentParser(description="Sync Grist components")
  sub = parser.add_subparsers(dest="cmd", required=True)

  common = argparse.ArgumentParser(add_help=False)
  common.add_argument("--config", default=CONFIG_DEFAULT, help="Chemin du fichier de config (default: grist_sync.config.json)")
  common.add_argument("--env", required=True, help="Environnement (clé dans config)")
  common.add_argument("--dotenv", default=DOTENV_DEFAULT, help="Chemin du fichier .env à charger (default: .env)")

  p_push = sub.add_parser("push", parents=[common], help="Pousser un ou plusieurs composants")
  p_push.add_argument("files", nargs="*", help="Fichiers à pousser (par défaut tous)")
  p_push.add_argument("--all", action="store_true", help="Pousser tous les fichiers")

  p_diff = sub.add_parser("diff", parents=[common], help="Comparer local vs Grist")
  p_diff.add_argument("files", nargs="*", help="Fichiers à comparer (par défaut tous)")
  p_diff.add_argument("--all", action="store_true", help="Diff de tous les fichiers")

  args = parser.parse_args()

  try:
    load_dotenv(args.dotenv)
    cfg = load_config(args.config)
    env_cfg = get_env_config(cfg, args.env)
  except ConfigError as e:
    print(f"Config error: {e}", file=sys.stderr)
    sys.exit(1)
  except Exception as e:
    print(f"Erreur: {e}", file=sys.stderr)
    sys.exit(1)

  components_dir = Path(cfg.get("components_dir", "grist/composants"))
  if not components_dir.exists():
    print(f"Dossier composants introuvable: {components_dir}", file=sys.stderr)
    sys.exit(1)

  files: List[Path]
  if getattr(args, "all", False):
    files = list_component_files(components_dir)
  else:
    if not args.files:
      print("Veuillez spécifier des fichiers ou --all", file=sys.stderr)
      sys.exit(1)
    files = [Path(f) for f in args.files]

  if args.cmd == "push":
    for f in files:
      push_component(env_cfg, f)
  elif args.cmd == "diff":
    for f in files:
      diff_component(env_cfg, f)


if __name__ == "__main__":
  main()
