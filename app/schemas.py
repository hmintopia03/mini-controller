from pydantic import BaseModel, Field


class ScaleRequest(BaseModel):
    replicas: int = Field(ge=0, le=10)

    model_config = {
        "json_schema_extra": {
            "examples": [{"replicas": 3}]
        }
    }


class DeploymentResponse(BaseModel):
    namespace: str
    name: str
    replicas: int
    available_replicas: int
    ready_replicas: int
    updated_replicas: int

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "namespace": "default",
                    "name": "worker",
                    "replicas": 3,
                    "available_replicas": 3,
                    "ready_replicas": 3,
                    "updated_replicas": 3,
                }
            ]
        }
    }

class DeploymentListResponse(BaseModel):
    namespace: str
    count: int
    deployments: list[DeploymentResponse]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "namespace": "default",
                    "count": 1,
                    "deployments": [
                        {
                            "namespace": "default",
                            "name": "worker",
                            "replicas": 3,
                            "available_replicas": 3,
                            "ready_replicas": 3,
                            "updated_replicas": 3,
                        }
                    ]
                }
            ]
        }
    }