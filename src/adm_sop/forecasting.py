"""Deterministic forecasting utilities for the ADM S&OP platform."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence


DEFAULT_SEASONALITY: dict[str, dict[int, float]] = {
    "tea": {
        1: 1.12,
        2: 1.08,
        3: 1.05,
        4: 0.97,
        5: 0.93,
        6: 0.90,
        7: 0.88,
        8: 0.89,
        9: 0.95,
        10: 1.08,
        11: 1.14,
        12: 1.18,
    },
    "drinks": {
        1: 0.89,
        2: 0.91,
        3: 0.95,
        4: 1.05,
        5: 1.10,
        6: 1.16,
        7: 1.20,
        8: 1.18,
        9: 1.08,
        10: 0.98,
        11: 0.93,
        12: 0.88,
    },
    "health products": {
        1: 1.10,
        2: 1.08,
        3: 1.04,
        4: 0.99,
        5: 0.96,
        6: 0.94,
        7: 0.95,
        8: 0.96,
        9: 1.00,
        10: 1.08,
        11: 1.13,
        12: 1.16,
    },
}

CHANNEL_BASE_FACTORS = {
    "shopify": 1.00,
    "d2c/shopify": 1.00,
    "amazon": 1.03,
    "both": 1.01,
}

CHANNEL_REFERENCE_CONVERSION = {
    "shopify": 0.030,
    "d2c/shopify": 0.030,
    "amazon": 0.120,
    "both": 0.070,
}


@dataclass(slots=True, frozen=True)
class ForecastInputs:
    historical_units: Sequence[float]
    category: str
    channel: str
    month: int
    baseline_method: str = "moving_average_8w"
    ad_spend_change_ratio: float = 0.0
    price_change_ratio: float = 0.0
    channel_conversion_rate: float | None = None
    channel_mix_factor: float = 1.0
    ambitious_target_ratio: float = 0.15
    ambitious_target_units: float | None = None
    actual_units: float | None = None
    seasonality_override: Mapping[int, float] | None = None


@dataclass(slots=True, frozen=True)
class ForecastOutput:
    baseline_units: float
    seasonality_index: float
    marketing_uplift: float
    price_impact: float
    channel_effect: float
    forecast_units: float
    ambitious_units: float
    actual_units: float | None
    accuracy_pct: float | None


def moving_average_baseline(history: Sequence[float], window: int = 8) -> float:
    """Return the average of the most recent observations."""
    if not history:
        raise ValueError("history must contain at least one value")
    slice_start = max(0, len(history) - window)
    recent_values = history[slice_start:]
    return sum(recent_values) / len(recent_values)


def exponential_smoothing_baseline(history: Sequence[float], alpha: float = 0.35) -> float:
    """Return a single smoothed demand value from historical observations."""
    if not history:
        raise ValueError("history must contain at least one value")
    if not 0 < alpha <= 1:
        raise ValueError("alpha must be between 0 and 1")

    smoothed = history[0]
    for value in history[1:]:
        smoothed = alpha * value + (1 - alpha) * smoothed
    return smoothed


def calculate_accuracy(actual_units: float, forecast_units: float) -> float:
    """Return forecast accuracy as a percentage."""
    if forecast_units <= 0:
        raise ValueError("forecast_units must be greater than zero")
    return max(0.0, 100 - (abs(actual_units - forecast_units) / forecast_units * 100))


def seasonality_index(
    category: str,
    month: int,
    override: Mapping[int, float] | None = None,
) -> float:
    if month < 1 or month > 12:
        raise ValueError("month must be in the range 1-12")

    seasonality_map = override or DEFAULT_SEASONALITY.get(_normalise_category(category))
    if seasonality_map is None:
        return 1.0
    return float(seasonality_map.get(month, 1.0))


def marketing_uplift(ad_spend_change_ratio: float, elasticity: float = 0.35) -> float:
    """Translate ad spend change into a capped demand multiplier."""
    raw_value = 1 + (ad_spend_change_ratio * elasticity)
    return _clamp(raw_value, lower=0.75, upper=1.35)


def price_impact(price_change_ratio: float, elasticity: float = -1.15) -> float:
    """Translate price change into a demand multiplier."""
    raw_value = 1 + (price_change_ratio * elasticity)
    return _clamp(raw_value, lower=0.70, upper=1.30)


def channel_effect(
    channel: str,
    conversion_rate: float | None = None,
    mix_factor: float = 1.0,
) -> float:
    """Blend channel default effect, conversion performance, and mix weighting."""
    channel_key = channel.strip().lower()
    base_factor = CHANNEL_BASE_FACTORS.get(channel_key, 1.0)
    reference_conversion = CHANNEL_REFERENCE_CONVERSION.get(channel_key)

    conversion_factor = 1.0
    if conversion_rate is not None and reference_conversion:
        conversion_delta = (conversion_rate - reference_conversion) / reference_conversion
        conversion_factor = 1 + (conversion_delta * 0.20)

    raw_value = base_factor * conversion_factor * mix_factor
    return _clamp(raw_value, lower=0.80, upper=1.25)


def generate_forecast(inputs: ForecastInputs) -> ForecastOutput:
    """Apply the agreed deterministic formula for the current planning month."""
    baseline_units = _select_baseline(inputs.historical_units, inputs.baseline_method)
    month_index = seasonality_index(inputs.category, inputs.month, inputs.seasonality_override)
    uplift = marketing_uplift(inputs.ad_spend_change_ratio)
    price_factor = price_impact(inputs.price_change_ratio)
    channel_factor = channel_effect(
        channel=inputs.channel,
        conversion_rate=inputs.channel_conversion_rate,
        mix_factor=inputs.channel_mix_factor,
    )

    forecast_units = baseline_units * month_index * uplift * price_factor * channel_factor
    ambitious_units = (
        inputs.ambitious_target_units
        if inputs.ambitious_target_units is not None
        else forecast_units * (1 + inputs.ambitious_target_ratio)
    )

    accuracy_pct = None
    if inputs.actual_units is not None:
        accuracy_pct = calculate_accuracy(inputs.actual_units, forecast_units)

    return ForecastOutput(
        baseline_units=round(baseline_units, 2),
        seasonality_index=round(month_index, 4),
        marketing_uplift=round(uplift, 4),
        price_impact=round(price_factor, 4),
        channel_effect=round(channel_factor, 4),
        forecast_units=round(forecast_units, 2),
        ambitious_units=round(ambitious_units, 2),
        actual_units=inputs.actual_units,
        accuracy_pct=round(accuracy_pct, 2) if accuracy_pct is not None else None,
    )


def generate_forecast_pair(inputs: ForecastInputs) -> tuple[float, float]:
    """Return the baseline and ambitious forecast values only."""
    output = generate_forecast(inputs)
    return output.forecast_units, output.ambitious_units


def _select_baseline(history: Sequence[float], baseline_method: str) -> float:
    method_key = baseline_method.strip().lower()
    if method_key == "moving_average_8w":
        return moving_average_baseline(history, window=8)
    if method_key == "exponential_smoothing":
        return exponential_smoothing_baseline(history)
    raise ValueError(f"unsupported baseline_method: {baseline_method}")


def _normalise_category(category: str) -> str:
    value = category.strip().lower()
    if "tea" in value:
        return "tea"
    if "drink" in value or "kefir" in value:
        return "drinks"
    if "health" in value or "romedio" in value:
        return "health products"
    return value


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))
