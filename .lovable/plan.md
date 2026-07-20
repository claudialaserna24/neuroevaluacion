## Objetivo
Cargar el PDF oficial al bucket privado `manual-assets`, dejarlo operativo con la infraestructura ya construida (Signed URLs + validación de plan desbloqueado) y mejorar el CTA en móvil para abrir el PDF en pestaña nueva.

## Estado actual (verificado)
- Bucket privado `manual-assets` creado, con RLS que solo permite subir/listar a admin.
- `plan.functions.ts` ya expone `getManualDownloadUrl` (verifica ownership + `plan_status = unlocked` + genera Signed URL 10 min) y `getManualStatus` para admin.
- Constantes en `src/lib/plan/constants.ts`: `MANUAL_BUCKET = "manual-assets"`, `MANUAL_OBJECT_PATH = "manual-oficial-ejercicios.pdf"`.
- Botones en `app.plan.$patientId.tsx` (tarjeta) y en `app.plan.$patientId.ver.tsx` (link dentro de cada ficha con el texto exacto solicitado) ya cableados a `getManualDownloadUrl`.
- `manual_pdf_url` existe en la tabla, pero la implementación actual — intencionalmente — resuelve la disponibilidad consultando Storage directamente (patrón upsert: reemplazar el archivo actualiza a todos los planes sin migraciones). No se modifica.

## Cambios a aplicar

### 1. Subir el PDF oficial al bucket
- Usar `supabase--storage_upload` con:
  - `bucket: manual-assets`
  - `path: manual-oficial-ejercicios.pdf` (mantengo el nombre estable que ya usa la constante, para no romper el cableado existente).
  - `file_path: /mnt/user-uploads/MANUAL_OFICIAL_DE_INTEGRACION_DE_REFLEJOS_NEUROPLAN.pdf`.
- Futuras actualizaciones: el admin lo reemplaza desde `/app/admin/manual` (ya construido) o volviendo a subir con el mismo path.

### 2. Mejora del CTA (ajuste solicitado)
En `src/routes/_authenticated/app.plan.$patientId.tsx`:
- Cambiar el label del botón de `"Descargar Manual Oficial (PDF)"` a `"📘 Ver Manual Oficial de Ejercicios"`.
- Cambiar el ícono `Download` por `BookOpen` (más coherente con "Ver").
- Cambiar el estado de carga a `"Abriendo…"`.
- Ajustar el handler para abrir la Signed URL en una nueva pestaña (`window.open(url, "_blank", "noopener")`) en lugar de forzar la descarga. El navegador mostrará el PDF en línea; el usuario decide descargar/imprimir. La Signed URL sigue siendo la misma (válida 10 min).
- El link dentro de cada ficha del Plan Interactivo (`app.plan.$patientId.ver.tsx`) se mantiene tal cual: al hacer clic en "Manual Oficial de Ejercicios NEUROPLAN" ya llama a `getManualDownloadUrl` — sólo se ajusta para abrir en pestaña nueva por consistencia.

### 3. Verificación end-to-end
Después del cambio:
- Confirmar upload con `supabase--read_query` sobre `storage.objects` (bucket + path + size).
- Correr `tsgo` para asegurar que los cambios de UI compilan.
- Reporte funcional al usuario listando: archivo en storage, Signed URL generada por backend con TTL 10 min, botón abre PDF en pestaña, enlace desde fichas funciona, y los guards ya vigentes en `getManualDownloadUrl` (auth + ownership + `plan_status = 'unlocked'`) impiden el acceso a usuarios sin plan.

## Fuera de alcance
- No se modifica la Skill del Plan, la Hoja de Ruta, pagos, ni la lógica de generación.
- No se toca `manual_pdf_url` en la BD (el patrón por Storage sigue vigente y es el que ya usa la UI).
