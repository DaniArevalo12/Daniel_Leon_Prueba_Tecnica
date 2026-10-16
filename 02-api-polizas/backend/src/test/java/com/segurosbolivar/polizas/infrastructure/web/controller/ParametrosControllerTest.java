package com.segurosbolivar.polizas.infrastructure.web.controller;

import com.segurosbolivar.polizas.application.RenovacionProperties;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ParametrosControllerTest {

    @Test
    void devuelveElIpcConfigurado() {
        ParametrosController controller = new ParametrosController(new RenovacionProperties(new BigDecimal("0.0375")));

        assertThat(controller.renovacion().ipc()).isEqualByComparingTo("0.0375");
    }
}
