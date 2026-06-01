from fastapi import HTTPException
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.config.config_exception import ConfigException
from app.config import NAMESPACE


try:
    config.load_incluster_config()
except ConfigException:
    config.load_kube_config()

apps = client.AppsV1Api()
core = client.CoreV1Api()


def handle_kubernetes_error(error: ApiException):
    if error.status == 404:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found"
        )

    raise HTTPException(
        status_code=500,
        detail=f"Kubernetes API error: {error.reason}"
    )


def ensure_namespace_exists(namespace: str):
    try:
        core.read_namespace(name=namespace)
    except ApiException as error:
        if error.status == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Namespace not found: {namespace}"
            )

        handle_kubernetes_error(error)

