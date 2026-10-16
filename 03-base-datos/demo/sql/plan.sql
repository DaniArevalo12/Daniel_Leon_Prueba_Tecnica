-- Muestra el plan REAL de la última ejecución de la consulta etiquetada &1:
-- E-Rows (estimadas) frente a A-Rows (reales), Buffers (lecturas lógicas) y A-Time por operación.
PROMPT
PROMPT ================ Plan real: &1 ================
SELECT plan_table_output
FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(
  (SELECT MAX(sql_id) KEEP (DENSE_RANK LAST ORDER BY last_active_time)
   FROM v$sql
   WHERE sql_text LIKE 'SELECT /*+ gather_plan_statistics */ /* &1 */%'),
  NULL,
  'ALLSTATS LAST +PREDICATE -NOTE'));
