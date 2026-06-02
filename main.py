from fastapi import FastAPI
from app.routers import health, deployments, pods, events, namespaces, watch
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.include_router(health.router)
app.include_router(deployments.router)  
app.include_router(pods.router)
app.include_router(events.router)
app.include_router(namespaces.router)
app.include_router(watch.router)

app.mount("/static", StaticFiles(directory="backend/static"), name="static")


@app.get("/dashboard")
def dashboard():
    return FileResponse("backend/static/dashboard.html")