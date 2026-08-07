from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, tenant, users, invites, activity, analytics, billing, admin

app = FastAPI(title="Nexus Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tenant.router)
app.include_router(users.router)
app.include_router(invites.router)
app.include_router(activity.router)
app.include_router(analytics.router)
app.include_router(billing.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
