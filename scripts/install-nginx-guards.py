"""Install reviewed snippets on Ubuntu; refuse an unexpected site configuration."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

# Verified against the user's byte-preserving Base64 export, including tabs.
BASELINE = "23c950ddef6b4e959d5a1798104e8cff65b565c0550d867c7866c05bef6e915c"
SITE = Path("/etc/nginx/sites-available/default")
BACKUPS = Path("/var/backups/ristool-nginx")
INCLUDE = "include /etc/nginx/snippets/ristool-guard-server.conf;"
FILES = {
    "ristool-guard-http.conf": Path("/etc/nginx/conf.d/ristool-guard-http.conf"),
    "ristool-guard-server.conf": Path("/etc/nginx/snippets/ristool-guard-server.conf"),
    "ristool-proxy.conf": Path("/etc/nginx/snippets/ristool-proxy.conf"),
}


def candidate(text):
    normalized = text.replace("\r\n", "\n").strip()
    actual = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    if actual != BASELINE:
        raise RuntimeError(
            "Site differs from reviewed nginx -T; nothing changed. "
            f"Expected SHA256={BASELINE}; actual SHA256={actual}; "
            f"characters={len(text)}; tabs={text.count(chr(9))}. "
            "Provide a fresh byte-preserving export; do not bypass this check."
        )
    marker = "server_name ristoolweb.com;"
    return text.replace(marker, marker + "\n        " + INCLUDE, 1)


def run(*args):
    subprocess.run(args, check=True)


def restore(backup):
    # Fixed destinations only: never trust filesystem paths from a manifest.
    manifest = json.loads((backup / "manifest.json").read_text(encoding="utf-8"))
    for name, target in {"site": SITE, **FILES}.items():
        if manifest[name]:
            shutil.copy2(backup / name, target)
        elif target.exists():
            target.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--rollback", type=Path)
    args = parser.parse_args()
    if os.name != "posix" or os.geteuid() != 0:
        raise RuntimeError("Run with sudo on the Ubuntu server.")
    if SITE.is_symlink():
        raise RuntimeError("Unexpected symlink at sites-available/default; inspect manually.")
    if args.rollback:
        backup = args.rollback.resolve()
        if backup.parent != BACKUPS or not backup.is_dir():
            raise RuntimeError("Rollback directory must be an immediate child of /var/backups/ristool-nginx.")
        restore(backup)
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        print("Rollback complete:", backup)
        return

    run("nginx", "-t")
    text = SITE.read_text(encoding="utf-8")
    updated = candidate(text)
    source = Path(__file__).resolve().parent.parent / "deploy" / "nginx"
    contents = {name: (source / name).read_text(encoding="utf-8") for name in FILES}
    if any(target.exists() or target.is_symlink() for target in FILES.values()):
        raise RuntimeError("Guard destination already exists; inspect before overwriting.")
    for target in FILES.values():
        if not target.parent.is_dir():
            raise RuntimeError("Missing Nginx directory: " + str(target.parent))
    backup = BACKUPS / datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup.mkdir(parents=True, mode=0o700)
    shutil.copy2(SITE, backup / "site")
    shutil.copy2(Path(__file__).resolve(), backup / "installer.py")
    (backup / "manifest.json").write_text(json.dumps({"site": True, **{name: False for name in FILES}}), encoding="utf-8")
    print("Backup:", backup, flush=True)
    try:
        for name, target in FILES.items():
            target.write_text(contents[name], encoding="utf-8")
            target.chmod(0o644)
        SITE.write_text(updated, encoding="utf-8")
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
    except BaseException:
        restore(backup)
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        raise
    print("Applied. Verify HTTPS, static resources, language switch, sign-in and API responses.")
    print("Rollback: sudo python3 scripts/install-nginx-guards.py --rollback", backup)


if __name__ == "__main__":
    main()
