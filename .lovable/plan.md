## CEREBRO — Importación CSV + UI de administrador

El CSV tiene 132 filas y las 5 columnas esperadas (`modulo`, `subcategoria`, `nivel_severidad`, `condicion_conductual`, `plan_accion_texto`). Mapeo 1:1 a `knowledge_documents`. Todas las columnas reconocidas, no hay campos sin correspondencia.

### 1. Importación inicial (one-shot)

Insertar las 132 filas vía el tool de inserción de datos, en un solo `INSERT` con `VALUES (...)` por fila. Mapeo:

- `modulo` → `module`
- `subcategoria` → `subcategory`
- `nivel_severidad` → `severity_level`
- `condicion_conductual` → `behavioral_condition`
- `plan_accion_texto` → `intervention_text`
- `active = true`, `version = 'v1'`, `image_url = NULL`
- `created_at` / `updated_at` por default de la tabla

Sin resúmenes, sin transformaciones. Texto íntegro. Prevención de duplicados en re-ejecución: `ON CONFLICT DO NOTHING` sobre un índice único parcial nuevo `(module, subcategory, severity_level, behavioral_condition) WHERE active`.

Distribución esperada:
- Reflejos: 37
- Áreas Funcionales: 32
- Actividades de intervención: 21
- Recomendaciones para familias: 17
- Preguntas frecuentes: 10
- Protocolos de aplicación: 8
- Perfil de Dominancia: 7

### 2. Migración de soporte

Añadir índice único parcial mencionado arriba, para permitir re-imports idempotentes desde la UI:

```text
CREATE UNIQUE INDEX knowledge_documents_dedupe_idx
  ON public.knowledge_documents (module, coalesce(subcategory,''),
       coalesce(severity_level,''), coalesce(behavioral_condition,''))
  WHERE active;
```

### 3. UI de administrador para futuras cargas

Nueva ruta protegida `/_authenticated/app/admin/cerebro`:

- Gate por rol: si `has_role(auth.uid(),'administrador')` es falso → redirect a `/app`.
- Componentes:
  - Contador actual de reglas activas por módulo (tabla resumen).
  - Zona de carga: `<input type="file" accept=".csv">` con preview de las primeras 5 filas y detección de columnas.
  - Validación de headers antes de importar; muestra columnas no reconocidas si las hay.
  - Modos: **Append** (default, salta duplicados por índice único) o **Reemplazar versión** (marca `active=false` las filas previas de la versión indicada e inserta como nueva `version`).
  - Botón "Importar" → llama server function que hace el bulk insert.
- Server functions nuevas (`src/lib/cerebro/knowledge.functions.ts`), todas con `requireSupabaseAuth` y verificación de rol admin dentro del handler:
  - `getKnowledgeStats()` → conteo por módulo.
  - `importKnowledgeCsv({ rows, version, mode })` → valida y hace `insert` en `knowledge_documents` con la sesión del admin (RLS ya permite INSERT sólo a administradores).
- El parseo del CSV se hace en el cliente (`papaparse`) para no subir archivos grandes; se envía JSON al server.

### 4. Preparación para la Skill

Ya cubierto por los índices compuestos existentes (`module, subcategory, severity_level` y `module, behavioral_condition`) sobre filas activas. Sin cambios adicionales.

### 5. Validación final

- Confirmar 132 registros insertados y desglose por módulo.
- Confirmar que `/app/admin/cerebro` carga para admin, redirige a no-admin.
- Confirmar que una re-importación del mismo CSV no crea duplicados.
- `image_url` queda como `NULL`, listo para futuras cargas sin cambios de esquema.

### Detalles técnicos

- Archivos nuevos:
  - `src/lib/cerebro/knowledge.functions.ts` (server fns).
  - `src/routes/_authenticated/app.admin.cerebro.tsx` (UI).
- Migración: índice único parcial.
- Dependencia nueva: `papaparse` + `@types/papaparse`.
- Sin cambios a tablas existentes ni al flujo de usuario final.
