from pydantic import BaseModel, Field

class ScaleRequest(BaseModel):
    replicas: int = Field(ge=0, le=10)