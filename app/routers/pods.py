from fastapi import APIRouter

from app.config import NAMESPACE
from app.kube import ensure_namespace_exists
from app.services import get_pod_logs


router = APIRouter(prefix="/pods", tags=["pods"])


@router.get(
    "/{name}/logs",
    summary="Get pod logs",
    description="Get recent logs from a Kubernetes pod."
)
def get_logs(
    name: str,
    namespace: str = NAMESPACE,
    tail_lines: int = 100
):
    ensure_namespace_exists(namespace)

    logs = get_pod_logs(
        name=name,
        namespace=namespace,
        tail_lines=tail_lines
    )

    return {
        "namespace": namespace,
        "pod": name,
        "tail_lines": tail_lines,
        "logs": logs
    }