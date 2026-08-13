import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Tenant, User

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Seed Tenants
        acme = db.query(Tenant).filter(Tenant.slug == "acme-corp").first()
        if not acme:
            acme = Tenant(name="Acme Corp", slug="acme-corp", plan="pro")
            db.add(acme)
            db.flush()

        beta = db.query(Tenant).filter(Tenant.slug == "beta-studio").first()
        if not beta:
            beta = Tenant(name="Beta Studio", slug="beta-studio", plan="free")
            db.add(beta)
            db.flush()

        # Seed Users for Acme
        users_acme = [
            ("owner@acme.com", "password123", "Acme Owner", "owner"),
            ("admin@acme.com", "password123", "Acme Admin", "admin"),
            ("viewer@acme.com", "password123", "Acme Viewer", "viewer"),
        ]
        for email, password, name, role in users_acme:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                db.add(User(
                    tenant_id=acme.id,
                    email=email,
                    password_hash=hash_password(password),
                    name=name,
                    role=role
                ))

        # Seed Users for Beta
        users_beta = [
            ("owner@beta.com", "password123", "Beta Owner", "owner"),
            ("viewer@beta.com", "password123", "Beta Viewer", "viewer"),
        ]
        for email, password, name, role in users_beta:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                db.add(User(
                    tenant_id=beta.id,
                    email=email,
                    password_hash=hash_password(password),
                    name=name,
                    role=role
                ))

        # Seed Superadmin
        superadmin = db.query(User).filter(User.email == "super@nexus.com").first()
        if not superadmin:
            db.add(User(
                tenant_id=None,
                email="super@nexus.com",
                password_hash=hash_password("superpassword"),
                name="Nexus Superadmin",
                role="superadmin"
            ))

        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print("Error seeding database:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
