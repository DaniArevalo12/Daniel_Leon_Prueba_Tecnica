package com.segurosbolivar.polizas.domain.model;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Inmueble arrendado asegurado por una póliza.
 */
@Entity
@Table(name = "riesgo")
public class Riesgo {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_riesgo")
    @SequenceGenerator(name = "seq_riesgo", sequenceName = "seq_riesgo", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poliza_id", nullable = false)
    private Poliza poliza;

    @Column(nullable = false, length = 200)
    private String direccionInmueble;

    @Column(nullable = false, length = 150)
    private String arrendatario;

    /** Arrendador: beneficiario de la póliza. */
    @Column(nullable = false, length = 150)
    private String arrendador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoRiesgo estado;

    @Version
    private Long version;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(nullable = false)
    private LocalDateTime fechaActualizacion;

    protected Riesgo() {
        // requerido por JPA
    }

    private Riesgo(String direccionInmueble, String arrendatario, String arrendador) {
        this.direccionInmueble = Objects.requireNonNull(direccionInmueble, "direccionInmueble");
        this.arrendatario = Objects.requireNonNull(arrendatario, "arrendatario");
        this.arrendador = Objects.requireNonNull(arrendador, "arrendador");
        this.estado = EstadoRiesgo.ACTIVO;
    }

    public static Riesgo nuevo(String direccionInmueble, String arrendatario, String arrendador) {
        return new Riesgo(direccionInmueble, arrendatario, arrendador);
    }

    /**
     * Cancela el riesgo. Cancelar un riesgo ya cancelado es un conflicto de estado (409).
     */
    public void cancelar() {
        if (estaCancelado()) {
            throw new ConflictoEstadoException("El riesgo %d ya está cancelado".formatted(id));
        }
        this.estado = EstadoRiesgo.CANCELADO;
    }

    public boolean estaCancelado() {
        return estado == EstadoRiesgo.CANCELADO;
    }

    @PrePersist
    void alCrear() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = fechaCreacion;
    }

    @PreUpdate
    void alActualizar() {
        fechaActualizacion = LocalDateTime.now();
    }

    /** Solo la póliza establece la relación, para mantener ambos lados consistentes. */
    void asignarPoliza(Poliza poliza) {
        this.poliza = poliza;
    }

    public Long getId() {
        return id;
    }

    public Poliza getPoliza() {
        return poliza;
    }

    public String getDireccionInmueble() {
        return direccionInmueble;
    }

    public String getArrendatario() {
        return arrendatario;
    }

    public String getArrendador() {
        return arrendador;
    }

    public EstadoRiesgo getEstado() {
        return estado;
    }

    public Long getVersion() {
        return version;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
}
