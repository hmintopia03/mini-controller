from kubernetes.client.exceptions import ApiException

from app.kube import apps, core, handle_kubernetes_error, ensure_namespace_exists
from app.config import NAMESPACE

def list_deployments_in_namespace(namespace: str):
    try:
        return apps.list_namespaced_deployment(
            namespace=namespace
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def scale_deployment_in_namespace(
    name: str,
    namespace: str,
    replicas: int
):
    body = {
        "spec": {
            "replicas": replicas
        }
    }

    try:
        return apps.patch_namespaced_deployment_scale(
            name=name,
            namespace=namespace,
            body=body
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def restart_deployment_in_namespace(name: str, namespace: str, restarted_at: str):
    body = {
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "mini-controller/restarted-at": restarted_at
                    }
                }
            }
        }
    }

    try:
        return apps.patch_namespaced_deployment(
        name=name,
        namespace=namespace,
        body=body
    )
    except ApiException as error:
        handle_kubernetes_error(error)


def list_pods_for_deployment(name: str, namespace: str):
    try:
        return core.list_namespaced_pod(
            namespace=namespace,
            label_selector=f"app={name}"
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def get_deployment_or_404(name: str, namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    try:
        return apps.read_namespaced_deployment(
            name=name,
            namespace=namespace
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def get_pod_logs(
    name: str,
    namespace: str,
    tail_lines: int = 100
):
    try:
        return core.read_namespaced_pod_log(
            name=name,
            namespace=namespace,
            tail_lines=tail_lines
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def list_events_in_namespace(namespace: str):
    try:
        return core.list_namespaced_event(
            namespace=namespace
        )
    except ApiException as error:
        handle_kubernetes_error(error)

def list_namespaces():
    try:
        return core.list_namespace()
    except ApiException as error:
        handle_kubernetes_error(error)