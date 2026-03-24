#!/usr/bin/env python3
"""
Bootstrap local users for VORTYX.

Usage:
  python3 setup_admin.py --username admin --password admin12345 --demo
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from database import SessionLocal, init_db
from models import PointsConfig, User
from utils.security import hash_password


DEFAULT_POINTS = {
    "create_vm": 10,
    "create_vdi": 10,
    "grant_rfid": 5,
    "revoke_rfid": 3,
    "resolve_alert": 8,
}


def ensure_points_config() -> None:
    db = SessionLocal()
    try:
        for action_name, points_value in DEFAULT_POINTS.items():
            existing = db.query(PointsConfig).filter(PointsConfig.action_name == action_name).first()
            if existing:
                continue
            db.add(PointsConfig(action_name=action_name, points_value=points_value))
        db.commit()
    finally:
        db.close()


def ensure_user(username: str, password: str, role: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            existing.password_hash = hash_password(password)
            existing.role = role
            existing.is_active = True
            print(f"Updated user: {username} ({role})")
        else:
            db.add(
                User(
                    username=username,
                    password_hash=hash_password(password),
                    role=role,
                    points_total=0,
                    is_active=True,
                )
            )
            print(f"Created user: {username} ({role})")
        db.commit()
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default=None)
    parser.add_argument("--role", default="admin", choices=["admin", "team-lead", "engineer", "viewer"])
    parser.add_argument("--demo", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    password = args.password or getpass.getpass("Admin password: ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")

    init_db()
    ensure_points_config()
    ensure_user(args.username, password, args.role)

    if args.demo:
        ensure_user("teamlead", "teamlead123", "team-lead")
        ensure_user("engineer1", "engineer123", "engineer")
        ensure_user("engineer2", "engineer123", "engineer")
        ensure_user("viewer", "viewer12345", "viewer")

    print("Bootstrap complete.")


if __name__ == "__main__":
    main()
