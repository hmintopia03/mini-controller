from fastapi import FastAPI

from app.routers import deployments, health


app = FastAPI()

app.include_router(health.router)
app.include_router(deployments.router)  