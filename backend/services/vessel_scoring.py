from __future__ import annotations

from typing import Optional


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


# Poseidon uses explainable evidence dimensions rather than a generic risk score.
DEFAULT_WEIGHTS = {
    "spatial": 0.24,
    "temporal": 0.22,
    "trajectory": 0.20,
    "behaviour": 0.16,
    "environment": 0.18,
}


def _band(score: float) -> str:
    if score >= 75:
        return "STRONG CORRELATION"
    if score >= 50:
        return "MODERATE CORRELATION"
    return "WEAK CORRELATION"


def _distance_match(distance_km: float) -> float:
    # A soft spatial decay avoids treating the nearest vessel as automatically responsible.
    return _clamp01(1.0 - distance_km / 40.0)


def _temporal_match(vessel: dict) -> float:
    value = 0.82 if vessel.get("temporal_candidate") else 0.30
    gap = float(vessel.get("max_ais_gap_hours", 0.0) or 0.0)
    return _clamp01(value * max(0.45, 1.0 - gap / 8.0))


def _trajectory_match(vessel: dict) -> float:
    heading_delta = abs(float(vessel.get("heading_delta_deg", 90.0) or 90.0))
    base = 0.86 if vessel.get("trajectory_consistent") else 0.34
    return _clamp01(base * (0.55 + 0.45 * _clamp01(1.0 - heading_delta / 180.0)))


def _behaviour_signal(vessel: dict) -> float:
    """Detects investigation-relevant movement changes without declaring wrongdoing."""
    speed_anomaly = bool(vessel.get("speed_anomaly"))
    min_sog = float(vessel.get("min_sog", vessel.get("sog", 10.0)) or 0.0)
    mean_sog = float(vessel.get("mean_sog", min_sog) or min_sog)
    loiter = min_sog < 2.5
    abrupt_change = bool(vessel.get("route_deviation")) or bool(vessel.get("heading_change_anomaly"))

    signal = 0.38
    if speed_anomaly:
        signal += 0.22
    if loiter:
        signal += 0.16
    if abrupt_change:
        signal += 0.16
    if mean_sog > 18:
        signal -= 0.05
    return _clamp01(signal)


def _environment_match(vessel: dict) -> float:
    current = 0.82 if vessel.get("current_compatible", vessel.get("trajectory_consistent")) else 0.50
    wind = 0.78 if vessel.get("wind_compatible", vessel.get("trajectory_consistent")) else 0.48
    return _clamp01(0.55 * current + 0.45 * wind)


def score_vessels(
    candidates: list[dict],
    origin: dict,
    origin_time: str,
    weights: Optional[dict] = None,
) -> dict:
    """Build an explainable vessel-correlation record for a reconstructed spill origin.

    This is an investigation-support model. It correlates AIS movement with the
    reconstructed release location/time and environmental drift signals; it does
    not determine legal responsibility.
    """
    weights_used = dict(DEFAULT_WEIGHTS)
    if weights:
        weights_used.update(weights)

    if not candidates:
        return {
            "ok": True,
            "ranked": [],
            "status": "No candidates",
            "message": "No AIS tracks intersected the reconstructed investigation corridor.",
            "analytical_weights": weights_used,
            "method": "spatio-temporal vessel correlation",
        }

    ranked: list[dict] = []
    for vessel in candidates:
        distance = float(vessel.get("min_distance_km", 99.0) or 99.0)
        spatial = _distance_match(distance)
        temporal = _temporal_match(vessel)
        trajectory = _trajectory_match(vessel)
        behaviour = _behaviour_signal(vessel)
        environment = _environment_match(vessel)

        composite = (
            weights_used["spatial"] * spatial
            + weights_used["temporal"] * temporal
            + weights_used["trajectory"] * trajectory
            + weights_used["behaviour"] * behaviour
            + weights_used["environment"] * environment
        )
        correlation = round(100 * composite, 1)

        gap_hours = float(vessel.get("max_ais_gap_hours", 0.0) or 0.0)
        min_sog = float(vessel.get("min_sog", vessel.get("sog", 0.0)) or 0.0)
        heading_delta = float(vessel.get("heading_delta_deg", 90.0) or 90.0)

        evidence = []
        if distance <= 10:
            evidence.append(f"AIS track approached the reconstructed origin within {distance:.1f} km.")
        if vessel.get("temporal_candidate"):
            evidence.append("AIS transmissions overlap the estimated release window.")
        if vessel.get("trajectory_consistent"):
            evidence.append(f"Observed heading is compatible with the reconstructed drift axis ({heading_delta:.0f}° delta).")
        if vessel.get("speed_anomaly") or vessel.get("route_deviation") or vessel.get("heading_change_anomaly"):
            evidence.append("Movement-pattern change detected inside the investigation window.")
        if vessel.get("wind_compatible") or vessel.get("current_compatible"):
            evidence.append("Movement is compatible with the environmental drift field.")

        counter_evidence = []
        if distance > 15:
            counter_evidence.append(f"Closest recorded approach was {distance:.1f} km from the reconstructed origin.")
        if gap_hours < 0.5:
            counter_evidence.append("AIS coverage is continuous through the investigation window.")
        if min_sog > 8 and not vessel.get("speed_anomaly"):
            counter_evidence.append("No material low-speed or loitering signal was detected.")

        coverage = "Continuous" if gap_hours < 0.5 else f"Gap {gap_hours:.1f} h"
        confidence = round(max(0.50, min(0.97, 0.58 + 0.30 * (1 - min(gap_hours, 4) / 4))), 2)

        ranked.append({
            **vessel,
            "correlation_score": correlation,
            "score": correlation,  # compatibility for existing UI components
            "overall_score": correlation,
            "correlation_band": _band(correlation),
            "priority": "REVIEW" if correlation >= 50 else "CONTEXT",
            "scores": {
                "spatial_proximity": round(100 * spatial, 1),
                "temporal_alignment": round(100 * temporal, 1),
                "trajectory_fit": round(100 * trajectory, 1),
                "behavioural_signal": round(100 * behaviour, 1),
                "environmental_fit": round(100 * environment, 1),
                "overall": correlation,
            },
            "evidence": evidence,
            "counter_evidence": counter_evidence,
            "ais_coverage": coverage,
            "confidence": confidence,
            "requires_human_review": True,
            "origin_reference": origin,
            "origin_time": origin_time,
            "method": "spatio-temporal vessel correlation",
        })

    ranked.sort(key=lambda item: item["correlation_score"], reverse=True)
    for rank, item in enumerate(ranked, start=1):
        item["rank"] = rank
        item["ranking"] = rank

    return {
        "ok": True,
        "ranked": ranked,
        "status": "Completed",
        "method": "spatio-temporal vessel correlation",
        "analytical_weights": weights_used,
        "dimensions": [
            "spatial proximity",
            "temporal alignment",
            "trajectory fit",
            "behavioural signal",
            "environmental compatibility",
        ],
        "disclaimer": (
            "Correlation results prioritize vessels for human review. They are not a finding of guilt, "
            "legal responsibility, or proof that a vessel caused the spill."
        ),
    }
