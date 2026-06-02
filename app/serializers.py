def serialize_deployment(deployment, namespace: str):
    return {
        "namespace": namespace,
        "name": deployment.metadata.name,
        "replicas": deployment.spec.replicas,
        "available_replicas": deployment.status.available_replicas or 0,
        "ready_replicas": deployment.status.ready_replicas or 0,
        "updated_replicas": deployment.status.updated_replicas or 0,
    }


def serialize_pod(pod, namespace: str):
    return {
        "namespace": namespace,
        "name": pod.metadata.name,
        "phase": pod.status.phase,
        "pod_ip": pod.status.pod_ip,
        "node_name": pod.spec.node_name,
        "created_at": pod.metadata.creation_timestamp,
    }

def serialize_event(event, namespace: str):
    return {
        "namespace": namespace,
        "name": event.metadata.name,
        "type": event.type,
        "reason": event.reason,
        "message": event.message,
        "involved_object_kind": event.involved_object.kind,
        "involved_object_name": event.involved_object.name,
        "count": event.count,
        "first_timestamp": event.first_timestamp,
        "last_timestamp": event.last_timestamp,
    }