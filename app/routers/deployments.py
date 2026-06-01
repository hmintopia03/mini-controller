from datetime import datetime, UTC

from fastapi import APIRouter

from app.config import NAMESPACE
from app.kube import ensure_namespace_exists
from app.services import (
    get_deployment_or_404,
    list_deployments_in_namespace,
    scale_deployment_in_namespace,
    restart_deployment_in_namespace,
    list_pods_for_deployment,
)
from app.schemas import ScaleRequest
from app.serializers import serialize_deployment, serialize_pod

router = APIRouter(prefix="/deployments", tags=["deployments"])
@router.get("")
def list_deployments(namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    deployments = list_deployments_in_namespace(
        namespace
    )
    items = [
    serialize_deployment(d, namespace)
    for d in deployments.items
    ]

    return {
        "namespace": namespace,
        "count": len(items),
        "deployments": items,
    }


@router.get("/{name}")
def get_deployment(name: str, namespace: str = NAMESPACE):
    deployment = get_deployment_or_404(name, namespace)
    return serialize_deployment(deployment, namespace)


@router.post("/{name}/scale")
def scale_deployment(
    name: str,
    request: ScaleRequest,
    namespace: str = NAMESPACE
):
    ensure_namespace_exists(namespace)

    scale_deployment_in_namespace(
        name=name,
        namespace=namespace,
        replicas=request.replicas
    )

    return {
        "namespace": namespace,
        "deployment": name,
        "replicas": request.replicas,
        "status": "scale requested"
    }

@router.post("/{name}/restart")
def restart_deployment(name: str, namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    restarted_at = datetime.now(UTC).isoformat()

    restart_deployment_in_namespace(
        name=name,
        namespace=namespace,
        restarted_at=restarted_at
    )

    return {
        "namespace": namespace,
        "deployment": name,
        "status": "restart requested",
        "restarted_at": restarted_at
    }

@router.get("/{name}/pods")
def list_deployment_pods(name: str, namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    pods = list_pods_for_deployment(
    name=name,
    namespace=namespace
    )

    return [
    serialize_pod(pod, namespace)
    for pod in pods.items
    ]   


@router.get("/{name}/rollout")
def get_rollout_status(name: str, namespace: str = NAMESPACE):
    deployment = get_deployment_or_404(name, namespace)

    desired = deployment.spec.replicas or 0
    updated = deployment.status.updated_replicas or 0
    ready = deployment.status.ready_replicas or 0
    available = deployment.status.available_replicas or 0

    complete = (
        updated == desired
        and ready == desired
        and available == desired
    )

    return {
        "namespace": namespace,
        "name": name,
        "desired_replicas": desired,
        "updated_replicas": updated,
        "ready_replicas": ready,
        "available_replicas": available,
        "rollout_complete": complete,
    }