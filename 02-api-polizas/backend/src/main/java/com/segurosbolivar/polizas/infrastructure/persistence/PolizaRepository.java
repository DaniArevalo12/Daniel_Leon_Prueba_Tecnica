package com.segurosbolivar.polizas.infrastructure.persistence;

import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PolizaRepository extends JpaRepository<Poliza, Long> {

    /**
     * Filtros opcionales: un parámetro nulo no restringe la búsqueda.
     */
    @Query("""
            select p from Poliza p
            where (:tipo is null or p.tipo = :tipo)
              and (:estado is null or p.estado = :estado)
            order by p.id
            """)
    List<Poliza> buscar(@Param("tipo") TipoPoliza tipo, @Param("estado") EstadoPoliza estado);

    /**
     * Consecutivo para el número de póliza, tomado de una secuencia de base de datos
     * para que sea único incluso con varias instancias de la API.
     */
    @Query(value = "SELECT seq_numero_poliza.NEXTVAL FROM DUAL", nativeQuery = true)
    long siguienteConsecutivoNumero();
}
