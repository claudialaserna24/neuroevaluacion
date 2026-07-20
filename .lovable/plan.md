## CEREBRO — Base de conocimiento clínico

Crear la arquitectura para importar y consultar reglas de intervención neurofuncional desde CSV. No incluye generación de Plan ni IA.

### 1. Tabla `knowledge_documents`

Migración con la siguiente estructura:

- `id` UUID PK
- `module` TEXT NOT NULL (Reflejos, Perfil Cognitivo, Evaluación Funcional)
- `subcategory` TEXT (Moro, Vestibular, Táctil, Auditiva, …)
- `severity_level` TEXT (libre, definido por CSV)
- `behavioral_condition` TEXT
- `intervention_text` TEXT NOT NULL (contenido íntegro, sin transformar)
- `image_url` TEXT NULL
- `active` BOOLEAN NOT NULL DEFAULT true
- `version` TEXT NOT NULL DEFAULT 'v1'
- `created_at`, `updated_at` con trigger `touch_updated_at`

Índices para consultas filtradas de la Skill:
- `(module, subcategory, severity_level)`
- `(module, behavioral_condition)`
- `(active)`

### 2. GRANTs + RLS

- GRANT SELECT, INSERT, UPDATE, DELETE al `service_role` (ALL) y `authenticated` (necesario para que la Skill/MCP consulte con el token del usuario).
- RLS habilitado.
- Políticas:
  - **SELECT** para `authenticated` cuando `active = true` — permite que la Skill consulte reglas activas durante la generación del Plan (autorizada al usuario autenticado; no expone edición).
  - **INSERT / UPDATE / DELETE** sólo cuando `public.has_role(auth.uid(), 'administrador')`.
- Sin acceso `anon`.

### 3. Storage: bucket `cerebro-assets`

- Bucket privado (`public=false`) creado con `supabase--storage_create_bucket`.
- Políticas RLS sobre `storage.objects`:
  - SELECT permitido a `authenticated` (Skill y consultas del Plan).
  - INSERT/UPDATE/DELETE sólo a administradores vía `has_role`.
- `image_url` almacenará la URL (firmada o pública según necesidad futura) generada al subir el archivo. En esta fase basta con el campo listo.

### 4. Importación CSV

En esta fase no se construye UI de importación completa; se deja el esquema listo para que Lovable/administrador importe filas 1:1. Cada fila del CSV → un registro. Sin concatenación.

Se documenta el mapeo esperado de columnas del CSV a campos de la tabla en `AGENTS.md` (o en un README breve dentro de `src/lib/cerebro/`) para que la próxima fase implemente el importador. No se crea función de importación todavía — el usuario no lo pidió.

### 5. Consulta futura (arquitectura, no implementación)

La tabla queda preparada para queries del tipo:

```sql
SELECT intervention_text, image_url
FROM knowledge_documents
WHERE active = true
  AND module = $1
  AND subcategory = ANY($2)
  AND severity_level = $3
  AND behavioral_condition = ANY($4);
```

Los índices compuestos anteriores soportan estos filtros.

### 6. Integración futura

Las tablas `assessments`, `neurodevelopment_roadmaps` (initial_reports) y la futura `interactive_plans` permanecen intactas. La Skill usará `patient_id → assessment → perfil` para derivar los filtros que aplicará contra `knowledge_documents`.

### 7. Validación

- Migración aplicada sin warnings de linter.
- Bucket creado.
- RLS verificado: administrador puede insertar/editar; usuario autenticado sólo lee reglas activas; anónimo no ve nada.

### Detalles técnicos

- Archivos nuevos: sólo la migración SQL y (opcional) `src/lib/cerebro/README.md` con el mapeo CSV → columnas. Sin cambios en tablas existentes ni en código de app.
- No se crean server functions de lectura todavía; se añadirán junto con el motor del Plan Interactivo en la fase siguiente.
