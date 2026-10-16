package com.segurosbolivar.polizas.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Política única de redondeo para valores monetarios (pesos colombianos con 2 decimales).
 * HALF_EVEN (redondeo bancario) evita el sesgo acumulado de HALF_UP en cálculos repetidos.
 */
public final class Montos {

    public static final int ESCALA = 2;
    public static final RoundingMode REDONDEO = RoundingMode.HALF_EVEN;

    private Montos() {
    }

    public static BigDecimal redondear(BigDecimal valor) {
        return valor.setScale(ESCALA, REDONDEO);
    }
}
