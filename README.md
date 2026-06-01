# Mini Controller

A lightweight Kubernetes deployment controller built with FastAPI and the Kubernetes Python client.

The project exposes a simple REST API for inspecting and operating Kubernetes Deployments without using `kubectl` directly.

---

## Features

**Health**
- API health endpoint
- Kubernetes connectivity health endpoint

**Deployments**
- List deployments
- Get deployment details
- Scale deployments
- Restart deployments
- Deployment rollout status

**Pods**
- List deployment pods

**Validation**
- Namespace validation
- Request validation using Pydantic
- Kubernetes API error handling

---

## Architecture

```
Client
  │
  ▼
FastAPI Router
  │
  ▼
Service Layer
  │
  ▼
Kubernetes Client
  │
  ▼
Kubernetes API Server
```

---

## Project Structure

```
mini-controller/
├── main.py
└── app/
    ├── config.py
    ├── kube.py
    ├── schemas.py
    ├── serializers.py
    ├── services.py
    └── routers/
        ├── health.py
        └── deployments.py
```

---

## Layer Responsibilities

### Routers — `routers/`
Handle HTTP requests and responses.
- Route definitions
- Request parsing
- Response generation

### Services — `services.py`
Contain deployment and pod operations.
- Deployment queries
- Scaling
- Restarting
- Pod lookup

### Schemas — `schemas.py`
Request validation models.
- Input validation
- API request contracts

### Serializers — `serializers.py`
Transform Kubernetes objects into API responses.
- Deployment serialization
- Pod serialization

### Kubernetes Layer — `kube.py`
Shared Kubernetes client configuration and helpers.
- Kubernetes API clients
- Namespace validation
- Common helpers

---

## API Endpoints

### Health
```
GET /health
GET /health/kubernetes
```

### Deployments
```
GET  /deployments
GET  /deployments/{name}
POST /deployments/{name}/scale
POST /deployments/{name}/restart
GET  /deployments/{name}/rollout
```

### Pods
```
GET /deployments/{name}/pods
```

---

## Example

Scale a deployment:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8000/deployments/worker/scale?namespace=default" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"replicas":3}'
```

---

## What I Learned

- FastAPI routing
- Pydantic request validation
- Kubernetes Python Client
- Deployment scaling and restart operations
- Namespace validation
- API error handling
- Layered backend architecture
- Service layer refactoring
