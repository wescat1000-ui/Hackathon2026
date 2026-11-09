"""Use under opentelemetry-instrument; otherwise spans are no-ops.

Never pass notes, transcripts, names, filenames, or raw exception messages.
"""
from contextlib import contextmanager
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

PHASES = frozenset({"score_submission", "extract_text", "embed_notes", "search_transcript", "calculate_score", "save_score", "load_leaderboard"})

@contextmanager
def scoring_step(phase):
    """Wrap an existing scoring operation without changing its result/errors."""
    if phase not in PHASES:
        raise ValueError("Unknown scoring phase")
    tracer = trace.get_tracer("rally.scoring")
    with tracer.start_as_current_span(
        "rally." + phase, record_exception=False, set_status_on_exception=False
    ) as span:
        try:
            yield span
        except Exception:
            span.set_status(Status(StatusCode.ERROR, "Scoring step failed"))
            raise
