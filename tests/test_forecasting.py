import pathlib
import sys
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC_PATH = PROJECT_ROOT / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

from adm_sop.forecasting import (  # noqa: E402
    ForecastInputs,
    calculate_accuracy,
    exponential_smoothing_baseline,
    generate_forecast,
    generate_forecast_pair,
    moving_average_baseline,
)


class ForecastingTests(unittest.TestCase):
    def test_moving_average_uses_recent_window(self) -> None:
        history = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
        self.assertEqual(moving_average_baseline(history, window=4), 17.5)

    def test_exponential_smoothing_returns_weighted_signal(self) -> None:
        history = [100, 110, 105, 120]
        result = exponential_smoothing_baseline(history, alpha=0.5)
        self.assertAlmostEqual(result, 112.5)

    def test_generate_forecast_produces_baseline_and_ambitious_values(self) -> None:
        inputs = ForecastInputs(
            historical_units=[100, 110, 120, 115, 118, 122, 125, 130],
            category="Tea",
            channel="Shopify",
            month=1,
            ad_spend_change_ratio=0.10,
            price_change_ratio=-0.05,
            channel_conversion_rate=0.033,
        )

        output = generate_forecast(inputs)

        self.assertGreater(output.forecast_units, output.baseline_units)
        self.assertGreater(output.ambitious_units, output.forecast_units)
        self.assertIsNone(output.accuracy_pct)

    def test_generate_forecast_pair_returns_two_values(self) -> None:
        inputs = ForecastInputs(
            historical_units=[50, 60, 55, 70, 80, 75, 85, 90],
            category="Drinks",
            channel="Amazon",
            month=7,
        )
        baseline_units, ambitious_units = generate_forecast_pair(inputs)
        self.assertGreater(ambitious_units, baseline_units)

    def test_accuracy_is_percentage_gap_inverse(self) -> None:
        self.assertAlmostEqual(calculate_accuracy(actual_units=95, forecast_units=100), 95.0)


if __name__ == "__main__":
    unittest.main()
