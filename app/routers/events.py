from fastapi import APIRouter

from app.config import NAMESPACE
from app.kube import ensure_namespace_exists
from app.services import list_events_in_namespace
from app.serializers import serialize_event


router = APIRouter(prefix="/events", tags=["events"])


@router.get(
    "",
    summary="List Kubernetes events",
    description="List recent Kubernetes events in the given namespace."
)
def list_events(namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    events = list_events_in_namespace(namespace)

    items = [
        serialize_event(event, namespace)
        for event in events.items
    ]

    return {
        "namespace": namespace,
        "count": len(items),
        "events": items,
    }