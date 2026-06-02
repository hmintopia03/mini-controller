from fastapi import FastAPI
from app.routers import health, deployments, pods, events, namespaces

app = FastAPI()

app.include_router(health.router)
app.include_router(deployments.router)  
app.include_router(pods.router)
app.include_router(events.router)
app.include_router(namespaces.router)