-- Align system_metrics.energy_abs default with the Absolute Biological Energy Baseline
-- E_ABS = 9.8420 J per RW-IDP v1.0 (was 10.0000)
ALTER TABLE system_metrics
  ALTER COLUMN energy_abs SET DEFAULT 9.8420;