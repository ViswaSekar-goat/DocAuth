from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Fail fast if Redis is down
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    broker_transport_options={"max_retries": 1, "interval_start": 0, "interval_step": 0, "interval_max": 0},
    result_backend_transport_options={"max_retries": 1},
)

# Optional: Auto-discover tasks from worker folder
celery_app.autodiscover_tasks(['worker.tasks'])
