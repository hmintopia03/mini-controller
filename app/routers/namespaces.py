from fastapi import APIRouter

from app.services import list_namespaces
from app.serializers import serialize_namespace

router = APIRouter(
    prefix="/namespaces",
    tags=["namespaces"]
)

@router.get(
    "",
    summary="List namespaces",
    description="List Kubernetes namespaces."
)
def get_namespaces():

    namespaces = list_namespaces()

    return [
        serialize_namespace(ns)
        for ns in namespaces.items
    ]