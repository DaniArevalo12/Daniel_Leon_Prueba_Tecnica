-- Esquema y datos sintéticos reproducibles (semilla fija).
-- Parámetros: &1 = número de orders, &2 = número de customers.
WHENEVER SQLERROR EXIT FAILURE
SET FEEDBACK OFF VERIFY OFF TIMING ON
DEFINE n_orders = &1
DEFINE n_customers = &2

PROMPT ==== Esquema ====
-- Solo las claves primarias: punto de partida "sin optimizar" (como el enunciado)
CREATE TABLE customers (
  customer_id   NUMBER(10)     NOT NULL,
  customer_name VARCHAR2(100)  NOT NULL,
  country       VARCHAR2(60)   NOT NULL,
  email         VARCHAR2(120),
  address       VARCHAR2(200),
  CONSTRAINT pk_customers PRIMARY KEY (customer_id)
);

CREATE TABLE orders (
  order_id      NUMBER(12)     NOT NULL,
  customer_id   NUMBER(10)     NOT NULL,
  order_date    DATE           NOT NULL,
  total_amount  NUMBER(12,2)   NOT NULL,
  status        VARCHAR2(20)   NOT NULL,
  shipping_info VARCHAR2(150),
  CONSTRAINT pk_orders PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_customers FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
);

PROMPT ==== Datos: &n_customers customers ====
-- Distribución por país (aprox.): Colombia 45 %, México 20 %, Perú 10 %, Chile 8 %, Ecuador 7 %,
-- Argentina 5 %, Panamá 3 %, Costa Rica 2 %. Dentro de México: 95 % 'México', 3 % 'Mexico', 2 % 'MEXICO'
-- (datos sucios intencionales para demostrar el problema de normalización).
EXEC DBMS_RANDOM.SEED(42)
INSERT /*+ APPEND */ INTO customers (customer_id, customer_name, country, email, address)
SELECT id,
       'Cliente ' || LPAD(id, 7, '0'),
       CASE
         WHEN r < 0.45 THEN 'Colombia'
         WHEN r < 0.65 THEN CASE WHEN r2 < 0.95 THEN 'México' WHEN r2 < 0.98 THEN 'Mexico' ELSE 'MEXICO' END
         WHEN r < 0.75 THEN 'Perú'
         WHEN r < 0.83 THEN 'Chile'
         WHEN r < 0.90 THEN 'Ecuador'
         WHEN r < 0.95 THEN 'Argentina'
         WHEN r < 0.98 THEN 'Panamá'
         ELSE 'Costa Rica'
       END,
       'cliente' || id || '@correo.test',
       RPAD('Calle ' || MOD(id, 200) || ' # ' || MOD(id, 97) || '-' || MOD(id, 53), 120, '.')
FROM (SELECT LEVEL AS id, DBMS_RANDOM.VALUE AS r, DBMS_RANDOM.VALUE AS r2 FROM dual CONNECT BY LEVEL <= &n_customers);
COMMIT;

PROMPT ==== Datos: &n_orders orders ====
-- customer_id uniforme, fechas uniformes entre 2022-01-01 y 2025-12-31 (4 años)
INSERT /*+ APPEND */ INTO orders (order_id, customer_id, order_date, total_amount, status, shipping_info)
SELECT ROWNUM,
       TRUNC(DBMS_RANDOM.VALUE(1, &n_customers + 1)),
       DATE '2022-01-01' + TRUNC(DBMS_RANDOM.VALUE(0, 1461)),
       ROUND(DBMS_RANDOM.VALUE(10, 5000), 2),
       CASE TRUNC(DBMS_RANDOM.VALUE(0, 4)) WHEN 0 THEN 'CREADA' WHEN 1 THEN 'PAGADA' WHEN 2 THEN 'ENVIADA' ELSE 'ENTREGADA' END,
       RPAD('Envío estándar - guía ' || ROWNUM, 100, '.')
FROM (SELECT 1 FROM dual CONNECT BY LEVEL <= 2000),
     (SELECT 1 FROM dual CONNECT BY LEVEL <= CEIL(&n_orders / 2000))
WHERE ROWNUM <= &n_orders;
COMMIT;

PROMPT ==== Estadísticas iniciales SIN histogramas (SIZE 1): el optimizador asume distribución uniforme ====
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(USER, 'CUSTOMERS', method_opt => 'FOR ALL COLUMNS SIZE 1', cascade => TRUE);
  DBMS_STATS.GATHER_TABLE_STATS(USER, 'ORDERS', method_opt => 'FOR ALL COLUMNS SIZE 1', cascade => TRUE);
END;
/

SET TIMING OFF
COLUMN segment_name FORMAT A30
PROMPT ==== Tamaño de los segmentos ====
SELECT segment_name, segment_type, ROUND(bytes / 1024 / 1024) AS mb, blocks FROM user_segments ORDER BY segment_name;
EXIT
