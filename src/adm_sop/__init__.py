"""ADM S&OP foundation package."""

from .forecasting import (
    ForecastInputs,
    ForecastOutput,
    calculate_accuracy,
    exponential_smoothing_baseline,
    generate_forecast,
    generate_forecast_pair,
    moving_average_baseline,
)

__all__ = [
    "ForecastInputs",
    "ForecastOutput",
    "calculate_accuracy",
    "exponential_smoothing_baseline",
    "generate_forecast",
    "generate_forecast_pair",
    "moving_average_baseline",
]
