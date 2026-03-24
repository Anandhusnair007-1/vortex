#!/usr/bin/env python3
"""
Vortex Platform - Admin Setup Script

This script performs initial platform setup including:
- Database initialization
- First admin user creation
- Demo users (optional)
- Configuration verification

Usage:
    docker-compose exec backend python setup_admin.py
    
    # Or with custom admin password:
    docker-compose exec backend python setup_admin.py --password my_secure_password
"""

import sys
import os
import getpass
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db, engine
from models import User, PointsConfig
from auth.jwt import get_password_hash
from sqlalchemy import inspect


def check_database():
    """Verify database connection and schema."""
    print("\n📋 Checking Database Connection...")
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if tables:
            print(f"   ✓ Database connected. Found {len(tables)} tables.")
            return True
        else:
            print("   ⚠ Database exists but no tables found.")
            return False
    except Exception as e:
        print(f"   ✗ Database connection failed: {str(e)}")
        return False


def init_database():
    """Initialize database schema."""
    print("\n🗄️  Initializing Database Schema...")
    try:
        init_db()
        print("   ✓ Database schema initialized.")
        return True
    except Exception as e:
        print(f"   ✗ Database initialization failed: {str(e)}")
        return False


def create_admin(username="admin", email="admin@vortex.local", password=None):
    """Create first admin user."""
    print("\n👤 Creating Admin User...")
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"   ⚠ User '{username}' already exists.")
            return False
        
        # Hash password
        if not password:
            password = getpass.getpass(f"   Enter admin password: ")
            if not password:
                print("   ✗ Password cannot be empty.")
                return False
        
        password_hash = get_password_hash(password)
        
        # Create user
        admin = User(
            username=username,
            email=email,
            password_hash=password_hash,
            role="admin",
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        
        print(f"   ✓ Admin created: {username} ({email})")
        print(f"   → Password: {'*' * len(password)}")
        
        return True
    except Exception as e:
        db.rollback()
        print(f"   ✗ Failed to create admin: {str(e)}")
        return False
    finally:
        db.close()


def create_demo_users():
    """Create demo users for testing."""
    print("\n👥 Creating Demo Users...")
    
    demo_users = [
        {
            "username": "teamlead",
            "email": "lead@vortex.local",
            "role": "team-lead",
            "password": "teamlead123"
        },
        {
            "username": "engineer1",
            "email": "engineer1@vortex.local",
            "role": "engineer",
            "password": "engineer123"
        },
        {
            "username": "engineer2",
            "email": "engineer2@vortex.local",
            "role": "engineer",
            "password": "engineer123"
        },
        {
            "username": "viewer",
            "email": "viewer@vortex.local",
            "role": "viewer",
            "password": "viewer123"
        }
    ]
    
    db = SessionLocal()
    created = 0
    
    try:
        for user_data in demo_users:
            existing = db.query(User).filter(
                User.username == user_data["username"]
            ).first()
            
            if existing:
                print(f"   ⚠ {user_data['username']} already exists, skipping.")
                continue
            
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                is_active=True
            )
            
            db.add(user)
            created += 1
        
        if created > 0:
            db.commit()
            print(f"   ✓ Created {created} demo users")
            return True
        else:
            print("   ℹ All demo users already exist.")
            return True
            
    except Exception as e:
        db.rollback()
        print(f"   ✗ Failed to create demo users: {str(e)}")
        return False
    finally:
        db.close()


def init_points_config():
    """Initialize points configuration."""
    print("\n🎯 Initializing Points Configuration...")
    
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(PointsConfig).first()
        if existing:
            print("   ℹ Points configuration already initialized.")
            return True
        
        # Create default config
        config = PointsConfig(
            action="default",
            points=0,
            description="Default points configuration"
        )
        
        db.add(config)
        db.commit()
        
        print("   ✓ Points configuration initialized.")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"   ✗ Failed to initialize points config: {str(e)}")
        return False
    finally:
        db.close()


def verify_configuration():
    """Verify that environment is properly configured."""
    print("\n⚙️  Verifying Configuration...")
    
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "ALGORITHM",
    ]
    
    optional_vars = [
        "PROXMOX_NODES",
        "PROXMOX_USERNAME",
        "PROXMOX_PASSWORD",
        "REDIS_URL",
    ]
    
    all_good = True
    
    for var in required_vars:
        if os.getenv(var):
            print(f"   ✓ {var}")
        else:
            print(f"   ✗ {var} (REQUIRED)")
            all_good = False
    
    for var in optional_vars:
        if os.getenv(var):
            print(f"   ℹ {var}")
        else:
            print(f"   ⊘ {var} (optional)")
    
    if all_good:
        print("\n   ✓ All required configuration is set.")
    else:
        print("\n   ⚠ Some required configuration is missing.")
        print("   → Review .env file and restart container.")
    
    return all_good


def print_credentials():
    """Print credentials for testing."""
    print("\n🔑 Test Credentials:")
    print("   " + "=" * 50)
    print("   Admin:")
    print("      Username: admin")
    print("      Password: admin (or your custom password)")
    print("")
    print("   Demo Users (if created):")
    print("      teamlead / teamlead123")
    print("      engineer1 / engineer123")
    print("      engineer2 / engineer123")
    print("      viewer / viewer123")
    print("   " + "=" * 50)


def main():
    """Run setup wizard."""
    print("\n" + "=" * 60)
    print("  Vortex Platform - Admin Setup")
    print("=" * 60)
    
    # Parse arguments
    custom_password = None
    create_demo = "--demo" in sys.argv
    
    for i, arg in enumerate(sys.argv):
        if arg == "--password" and i + 1 < len(sys.argv):
            custom_password = sys.argv[i + 1]
    
    # Execute setup
    success = True
    
    # 1. Check database
    if not check_database():
        if not init_database():
            print("\n✗ Failed to initialize database. Exiting.")
            sys.exit(1)
    
    # 2. Initialize database schema
    if not init_database():
        print("\n✗ Failed to initialize schema. Exiting.")
        sys.exit(1)
    
    # 3. Verify configuration
    verify_configuration()
    
    # 4. Create admin
    if not create_admin(password=custom_password):
        print("\n✗ Failed to create admin. Exiting.")
        sys.exit(1)
    
    # 5. Create demo users if requested
    if create_demo:
        if not create_demo_users():
            success = False
    
    # 6. Initialize points config
    if not init_points_config():
        success = False
    
    # 7. Print summary
    print("\n" + "=" * 60)
    if success:
        print("  ✓ Setup Completed Successfully!")
    else:
        print("  ⚠ Setup completed with some warnings.")
    print("=" * 60)
    
    print_credentials()
    
    print("\n📝 Next Steps:")
    print("   1. Access frontend at https://vortex.internal")
    print("   2. Login with admin credentials")
    print("   3. Create additional users in Settings → Users")
    print("   4. Configure Proxmox nodes in .env")
    print("   5. Connect RFID devices in Security → RFID Access")
    print("   6. Setup Observium webhook for alerts")
    print("   7. Review DEPLOYMENT.md for production procedures")
    print("")


if __name__ == "__main__":
    main()
