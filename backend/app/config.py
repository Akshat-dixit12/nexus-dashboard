from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nexus"
    SECRET_KEY: str = "nexus_super_secret_jwt_key_change_in_production_32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    STRIPE_SECRET_KEY: str = "sk_test_placeholder_key"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder_secret"
    SMTP_HOST: str = ""
    SMTP_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    SUPERADMIN_EMAILS: str = "super@nexus.com"
    SUPERADMIN_USER_IDS: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
