-- Backfill preset_key en tareas existentes (un solo uso).
-- Ejecutar con: sqlite3 data/garageledger.db < scripts/backfill-preset-keys.sql
UPDATE maintenance_tasks SET preset_key = 'engine_oil_filter' WHERE part_name = 'Aceite de motor y filtro' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'engine_oil_filter' WHERE part_name = 'Aceite y filtro' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'engine_air_filter' WHERE part_name = 'Filtro de aire del motor' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'fuel_filter' WHERE part_name = 'Filtro de combustible' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'spark_plugs' WHERE part_name = 'Bujías' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'ignition_coils' WHERE part_name = 'Bobinas de encendido' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'valve_clearance' WHERE part_name = 'Reglaje de válvulas' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'brake_pads' WHERE part_name = 'Pastillas de freno' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'brake_discs' WHERE part_name = 'Discos de freno' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'cabin_filter' WHERE part_name = 'Filtro de habitáculo' AND (preset_key IS NULL OR preset_key = '');
UPDATE maintenance_tasks SET preset_key = 'cabin_filter' WHERE part_name = 'Filtro de habitaculo' AND (preset_key IS NULL OR preset_key = '');