# Diagrama Entidad-Relación de la Base de Datos (`simulador_bancario`)

Este documento contiene el diseño relacional de la base de datos MySQL del sistema **NovaBank — Simulador Bancario Web**, cumpliendo con los requisitos de las Secciones 13 y 16 del documento del proyecto.

---

## 1. Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    USUARIOS ||--o{ CUENTAS : "es titular de (1:N)"
    CUENTAS ||--o{ MOVIMIENTOS : "registra (1:N)"
    CUENTAS ||--o{ TRANSFERENCIAS : "envia desde (cuenta_origen_id)"
    CUENTAS ||--o{ TRANSFERENCIAS : "recibe en (cuenta_destino_id)"

    USUARIOS {
        int id PK "AUTO_INCREMENT"
        varchar(20) documento UK "NOT NULL (Cédula / Documento)"
        varchar(120) nombre_completo "NOT NULL"
        varchar(120) correo UK "NOT NULL"
        varchar(25) telefono "NULL"
        varchar(180) direccion "NULL"
        varchar(255) password_hash "NOT NULL (Encriptado con bcrypt)"
        enum rol "ADMIN | CLIENTE"
        enum estado "ACTIVO | INACTIVO | BLOQUEADO"
        datetime fecha_creacion "DEFAULT CURRENT_TIMESTAMP"
    }

    CUENTAS {
        int id PK "AUTO_INCREMENT"
        int usuario_id FK "NOT NULL -> usuarios(id)"
        varchar(20) numero_cuenta UK "NOT NULL"
        enum tipo_cuenta "AHORROS | CORRIENTE"
        decimal(15_2) saldo "NOT NULL DEFAULT 0.00 (CHECK >= 0)"
        varchar(255) pin_hash "NOT NULL (PIN Cajero en bcrypt)"
        enum estado "ACTIVO | INACTIVO | BLOQUEADO"
        datetime fecha_apertura "DEFAULT CURRENT_TIMESTAMP"
    }

    MOVIMIENTOS {
        int id PK "AUTO_INCREMENT"
        int cuenta_id FK "NOT NULL -> cuentas(id)"
        datetime fecha "DEFAULT CURRENT_TIMESTAMP"
        enum tipo_movimiento "CONSIGNACION | RETIRO_CAJERO | TRANSFERENCIA_ENVIADA | TRANSFERENCIA_RECIBIDA"
        varchar(255) descripcion "NOT NULL"
        decimal(15_2) valor "NOT NULL (CHECK > 0)"
        decimal(15_2) saldo_resultante "NOT NULL"
    }

    TRANSFERENCIAS {
        int id PK "AUTO_INCREMENT"
        int cuenta_origen_id FK "NOT NULL -> cuentas(id)"
        int cuenta_destino_id FK "NOT NULL -> cuentas(id)"
        decimal(15_2) valor "NOT NULL (CHECK > 0)"
        varchar(255) descripcion "NOT NULL"
        datetime fecha "DEFAULT CURRENT_TIMESTAMP"
    }
```

---

## 2. Descripción de Tablas, Llaves y Restricciones

| Tabla | Llave Primaria (PK) | Llaves Foráneas (FK) | Restricciones de Integridad y Reglas de Negocio |
| :--- | :--- | :--- | :--- |
| **`usuarios`** | `id` | — | `documento` (`UNIQUE`), `correo` (`UNIQUE`), `password_hash` (`NOT NULL`), `rol` (`ADMIN`, `CLIENTE`), `estado` (`ACTIVO`, `INACTIVO`, `BLOQUEADO`). |
| **`cuentas`** | `id` | `usuario_id` → `usuarios(id)` (`ON DELETE RESTRICT`) | `numero_cuenta` (`UNIQUE`), `chk_saldo_no_negativo` (`CHECK (saldo >= 0)`), `pin_hash` (`NOT NULL`), `estado` (`ACTIVO`, `INACTIVO`, `BLOQUEADO`). |
| **`movimientos`** | `id` | `cuenta_id` → `cuentas(id)` (`ON DELETE RESTRICT`) | `chk_valor_movimiento_positivo` (`CHECK (valor > 0)`), inmutabilidad de movimientos financieros. |
| **`transferencias`** | `id` | `cuenta_origen_id` → `cuentas(id)`<br>`cuenta_destino_id` → `cuentas(id)` | `chk_valor_transferencia_positivo` (`CHECK (valor > 0)`), `chk_cuentas_distintas` (`CHECK (cuenta_origen_id <> cuenta_destino_id)`). |
