import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from kubernetes import watch

from app.config import NAMESPACE
from app.kube import core, ensure_namespace_exists
from app.serializers import serialize_event


router = APIRouter(prefix="/watch", tags=["watch"])


@router.get("/events")
def watch_events(namespace: str = NAMESPACE):
    ensure_namespace_exists(namespace)

    def event_stream():
        watcher = watch.Watch()

        try:
            for event in watcher.stream(
                core.list_namespaced_event,
                namespace=namespace,
                timeout_seconds=300,
            ):
                payload = {
                    "watch_type": event["type"],
                    "event": serialize_event(event["object"], namespace),
                }

                yield f"data: {json.dumps(payload, default=str)}\n\n"


        except Exception as error:
            payload = {
                "watch_type": "ERROR",
                "error": str(error),
            }

            yield f"data: {json.dumps(payload)}\n\n"

        finally:
            watcher.stop()

    return StreamingResponse(
    event_stream(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    },
    )