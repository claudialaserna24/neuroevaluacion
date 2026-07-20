# CEREBRO — Base de conocimiento clínico

Tabla: `public.knowledge_documents`. Cada fila = una regla clínica independiente.
Bucket de Storage: `cerebro-assets` (privado). `image_url` guarda la ruta/URL del recurso.

## Mapeo CSV → columnas

| Columna CSV            | Columna DB              | Requerido | Notas |
|------------------------|-------------------------|-----------|-------|
| `module`               | `module`                | sí        | Reflejos / Perfil Cognitivo / Evaluación Funcional |
| `subcategory`          | `subcategory`           | no        | Moro, Vestibular, Táctil, Auditiva, … |
| `severity_level`       | `severity_level`        | no        | Valor libre definido por la metodología |
| `behavioral_condition` | `behavioral_condition`  | no        | Ej. Desbordes emocionales, Baja atención |
| `intervention_text`    | `intervention_text`     | sí        | Texto íntegro; no resumir |
| `image_url`            | `image_url`             | no        | URL/ruta en el bucket `cerebro-assets` |
| `active`               | `active`                | no        | Default `true` |
| `version`              | `version`               | no        | Default `v1` |

## Seguridad (RLS)

- **Administrador** (`has_role(uid, 'administrador')`): INSERT / UPDATE / DELETE.
- **Authenticated**: SELECT únicamente sobre reglas con `active = true` (incluye a la Skill / MCP con el token del usuario).
- **Anon**: sin acceso.

## Consulta filtrada (patrón de referencia para la Skill)

```sql
SELECT id, intervention_text, image_url
FROM public.knowledge_documents
WHERE active = true
  AND module = $1
  AND ($2::text IS NULL OR subcategory = $2)
  AND ($3::text IS NULL OR severity_level = $3)
  AND ($4::text IS NULL OR behavioral_condition = $4);
```

Índices soportan `(module, subcategory, severity_level)` y `(module, behavioral_condition)` sobre filas activas.

## Fuera de alcance en esta fase

- Importador CSV desde UI.
- Server functions de consulta.
- Generación del Plan Interactivo / integración IA.