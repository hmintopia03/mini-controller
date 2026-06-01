from fastapi import APIRouter
from kubernetes.client.exceptions import ApiException

from app.config import NAMESPACE
from app.kube import apps


router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/kubernetes")
def kubernetes_health():
    try:
        apps.list_namespaced_deployment(
            namespace=NAMESPACE
        )

        return {
            "status": "connected",
            "namespace": NAMESPACE
        }

    except ApiException as error:
        return {
            "status": "disconnected",
            "reason": error.reason
        }