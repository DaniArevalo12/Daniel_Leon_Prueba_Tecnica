-- Experimentos: cada estrategia se aplica sobre la anterior y se mide la consulta del enunciado.
-- México ≈ 20 % de los customers (selectividad alta); Costa Rica ≈ 2 % (selectividad baja).
WHENEVER SQLERROR EXIT FAILURE
SET FEEDBACK OFF VERIFY OFF LINESIZE 220 PAGESIZE 200 TRIMSPOOL ON TIMING OFF
COLUMN plan_table_output FORMAT A215

PROMPT ######## Distribución real de países ########
COLUMN country FORMAT A15
SELECT country, COUNT(*) AS customers, ROUND(100 * RATIO_TO_REPORT(COUNT(*)) OVER (), 2) AS pct
FROM customers GROUP BY country ORDER BY customers DESC;

-- ============================================================================================
PROMPT ######## E0 · Línea base: solo PK, estadísticas SIN histograma ########
EXEC medir('E0_MX', q'[SELECT /*+ gather_plan_statistics */ /* E0_MX */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México']')
@@plan E0_MX
EXEC medir('E0_CR', q'[SELECT /*+ gather_plan_statistics */ /* E0_CR */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'Costa Rica']')
@@plan E0_CR

-- ============================================================================================
PROMPT ######## E1 · Estadísticas con histograma de frecuencia en country ########
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(USER, 'CUSTOMERS',
    method_opt => 'FOR ALL COLUMNS SIZE 1 FOR COLUMNS country SIZE 254', cascade => TRUE);
END;
/
COLUMN column_name FORMAT A15
SELECT column_name, num_distinct, histogram FROM user_tab_col_statistics WHERE table_name = 'CUSTOMERS' AND column_name = 'COUNTRY';
EXEC medir('E1_MX', q'[SELECT /*+ gather_plan_statistics */ /* E1_MX */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México']')
@@plan E1_MX
EXEC medir('E1_CR', q'[SELECT /*+ gather_plan_statistics */ /* E1_CR */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'Costa Rica']')
@@plan E1_CR

-- ============================================================================================
PROMPT ######## E2 · Índices compuestos y cubrientes ########
SET TIMING ON
CREATE INDEX ix_customers_pais ON customers (country, customer_id, customer_name);
CREATE INDEX ix_orders_cliente ON orders (customer_id, order_date, total_amount, order_id);
SET TIMING OFF
COLUMN index_name FORMAT A22
SELECT index_name, leaf_blocks, ROUND(leaf_blocks * 8 / 1024) AS mb_aprox FROM user_indexes WHERE table_name IN ('CUSTOMERS', 'ORDERS') ORDER BY index_name;
EXEC medir('E2_MX', q'[SELECT /*+ gather_plan_statistics */ /* E2_MX */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México']')
@@plan E2_MX
EXEC medir('E2_CR', q'[SELECT /*+ gather_plan_statistics */ /* E2_CR */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'Costa Rica']')
@@plan E2_CR

-- ============================================================================================
PROMPT ######## E3 · Particionamiento por rango de order_date (consulta acotada al último trimestre) ########
SET TIMING ON
CREATE TABLE orders_part
  PARTITION BY RANGE (order_date) INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))
  (PARTITION p_inicial VALUES LESS THAN (DATE '2022-01-01'))
  AS SELECT * FROM orders;
CREATE INDEX ix_orders_part_cliente ON orders_part (customer_id, order_date, total_amount, order_id) LOCAL;
SET TIMING OFF
EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'ORDERS_PART', cascade => TRUE)
SELECT COUNT(*) AS particiones FROM user_tab_partitions WHERE table_name = 'ORDERS_PART';
EXEC medir('E3_FECHA_SIN_PART', q'[SELECT /*+ gather_plan_statistics */ /* E3_FECHA_SIN_PART */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México' AND o.order_date >= DATE '2025-10-01']')
@@plan E3_FECHA_SIN_PART
EXEC medir('E3_FECHA_PART', q'[SELECT /*+ gather_plan_statistics */ /* E3_FECHA_PART */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders_part o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México' AND o.order_date >= DATE '2025-10-01']')
@@plan E3_FECHA_PART

-- ============================================================================================
PROMPT ######## E4 · Vista materializada con refresco FAST (MV logs) ########
SET TIMING ON
CREATE MATERIALIZED VIEW LOG ON orders WITH ROWID;
CREATE MATERIALIZED VIEW LOG ON customers WITH ROWID;
CREATE MATERIALIZED VIEW mv_ordenes_cliente
  BUILD IMMEDIATE
  REFRESH FAST ON DEMAND
  AS SELECT o.ROWID AS o_rid, c.ROWID AS c_rid,
            o.order_id, o.order_date, c.customer_name, o.total_amount, c.country
     FROM orders o, customers c
     WHERE o.customer_id = c.customer_id;
CREATE INDEX ix_mv_pais ON mv_ordenes_cliente (country);
SET TIMING OFF
EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'MV_ORDENES_CLIENTE', cascade => TRUE)
EXEC medir('E4_MV_MX', q'[SELECT /*+ gather_plan_statistics */ /* E4_MV_MX */ order_id, order_date, customer_name, total_amount FROM mv_ordenes_cliente WHERE country = 'México']')
@@plan E4_MV_MX
EXEC medir('E4_MV_CR', q'[SELECT /*+ gather_plan_statistics */ /* E4_MV_CR */ order_id, order_date, customer_name, total_amount FROM mv_ordenes_cliente WHERE country = 'Costa Rica']')
@@plan E4_MV_CR

PROMPT == Refresco FAST tras insertar una orden nueva ==
INSERT INTO orders (order_id, customer_id, order_date, total_amount, status, shipping_info)
SELECT (SELECT MAX(order_id) + 1 FROM orders), (SELECT MIN(customer_id) FROM customers WHERE country = 'México'),
       DATE '2025-12-31', 123.45, 'CREADA', 'Orden de prueba de refresco'
FROM dual;
COMMIT;
SET TIMING ON
EXEC DBMS_MVIEW.REFRESH('MV_ORDENES_CLIENTE', 'F')
SET TIMING OFF
SELECT COUNT(*) AS orden_nueva_en_mv FROM mv_ordenes_cliente WHERE order_id = (SELECT MAX(order_id) FROM orders);
COLUMN mview_name FORMAT A20
SELECT mview_name, last_refresh_type, staleness FROM user_mviews;

-- ============================================================================================
PROMPT ######## E5 · Paginación: OFFSET profundo frente a keyset (páginas de 50 filas) ########
SET TIMING ON
CREATE INDEX ix_orders_fecha ON orders (order_date, order_id, customer_id, total_amount);
SET TIMING OFF
EXEC medir('E5_PAGINA_1', q'[SELECT /*+ gather_plan_statistics */ /* E5_PAGINA_1 */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México' ORDER BY o.order_date DESC, o.order_id DESC FETCH FIRST 50 ROWS ONLY]')
@@plan E5_PAGINA_1
EXEC medir('E5_OFFSET_10000', q'[SELECT /*+ gather_plan_statistics */ /* E5_OFFSET_10000 */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México' ORDER BY o.order_date DESC, o.order_id DESC OFFSET 10000 ROWS FETCH NEXT 50 ROWS ONLY]')
@@plan E5_OFFSET_10000

-- Última fila de la página 200 (offset 9.950–9.999): la "llave" para pedir la página 201 con keyset
COLUMN ult_fecha NEW_VALUE ult_fecha
COLUMN ult_id NEW_VALUE ult_id
SELECT TO_CHAR(o.order_date, 'YYYY-MM-DD') AS ult_fecha, o.order_id AS ult_id
FROM orders o JOIN customers c ON o.customer_id = c.customer_id
WHERE c.country = 'México'
ORDER BY o.order_date DESC, o.order_id DESC
OFFSET 9999 ROWS FETCH NEXT 1 ROWS ONLY;
EXEC medir('E5_KEYSET_201', q'[SELECT /*+ gather_plan_statistics */ /* E5_KEYSET_201 */ o.order_id, o.order_date, c.customer_name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.country = 'México' AND o.order_date <= DATE '&ult_fecha' AND (o.order_date < DATE '&ult_fecha' OR o.order_id < &ult_id) ORDER BY o.order_date DESC, o.order_id DESC FETCH FIRST 50 ROWS ONLY]')
@@plan E5_KEYSET_201

-- ============================================================================================
PROMPT ######## E6 · Calidad de datos: variantes de "México" ########
SELECT c.country, COUNT(DISTINCT c.customer_id) AS customers, COUNT(o.order_id) AS orders
FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE UPPER(TRANSLATE(c.country, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) = 'MEXICO'
GROUP BY c.country ORDER BY customers DESC;

PROMPT == Normalización: código ISO 3166-1 alfa-2 ==
ALTER TABLE customers ADD country_code CHAR(2);
UPDATE customers SET country_code = CASE UPPER(TRANSLATE(country, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
  WHEN 'COLOMBIA' THEN 'CO' WHEN 'MEXICO' THEN 'MX' WHEN 'PERU' THEN 'PE' WHEN 'CHILE' THEN 'CL'
  WHEN 'ECUADOR' THEN 'EC' WHEN 'ARGENTINA' THEN 'AR' WHEN 'PANAMA' THEN 'PA' WHEN 'COSTA RICA' THEN 'CR' END;
COMMIT;
SELECT (SELECT COUNT(*) FROM customers WHERE country_code = 'MX') AS customers_mx_por_codigo,
       (SELECT COUNT(*) FROM customers WHERE country = 'México')  AS customers_por_texto_exacto
FROM dual;

-- ============================================================================================
PROMPT ######## RESUMEN (mediana de 5 ejecuciones medidas, tras 1 de calentamiento) ########
COLUMN etiqueta FORMAT A20
SELECT etiqueta,
       COUNT(*)                     AS reps,
       ROUND(MEDIAN(ms))            AS ms_mediana,
       ROUND(MIN(ms))               AS ms_min,
       ROUND(MAX(ms))               AS ms_max,
       ROUND(MEDIAN(lecturas))      AS lecturas_logicas,
       MAX(filas)                   AS filas
FROM resultados
GROUP BY etiqueta
ORDER BY MIN(creado);
EXIT
