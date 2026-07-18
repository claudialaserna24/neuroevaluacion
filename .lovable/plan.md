# NEUROPLAN — Fase 1: Fundamento (revisado)

## Cambios respecto al plan anterior
- Landing pública dirigida solo al padre de familia — se elimina el bloque "Portal para profesionales" / CEREBRO CRM.
- Moholka NO aparece en la landing ni en el onboarding — aparece únicamente después del registro, dentro del flujo de evaluación (Fase 2).
- Autenticación con dos roles: `usuario` (padre de familia) y `administrador` (neuropsicólogo).
- Diseño minimalista siguiendo la referencia adjunta: tarjetas blancas con esquinas muy redondeadas, inputs con ícono a la izquierda y label flotante, botón principal tipo píldora, tabs Login/Register segmentados en la parte superior.
- No se generan imágenes nuevas — habrá un banco de imágenes prediseñadas que se conectará más adelante.

## Dirección visual
Base "Retrato ilustrado" pero adaptada a un tono minimalista siguiendo la referencia:
- Fondo blanco (#FFFFFF) con superficies neutras muy claras.
- Azul principal #1A858D como acento (tabs activos, botón principal, links secundarios).
- Tarjetas con radio grande (~24px), sombra muy suave, borde apenas visible.
- Tipografía: Fraunces para display/títulos, Instrument Sans para UI y cuerpo.
- Iconografía lineal simple (lucide-react) en color azul principal.

## Alcance de esta fase

### 1. Sistema de diseño (`src/styles.css`)
Actualizar tokens en `oklch`:
- `--background`: blanco puro
- `--foreground`: azul muy oscuro derivado de #1A858D
- `--primary`: #1A858D
- `--primary-foreground`: blanco
- `--muted` / `--muted-foreground`: grises muy suaves con matiz azul
- `--border` / `--input`: gris casi imperceptible
- `--radius`: 1.25rem para el look pill/tarjeta redondeada

Cargar fuentes Fraunces + Instrument Sans vía `<link>` en `__root.tsx`.

### 2. SEO y metadatos (`src/routes/__root.tsx`)
- Título: "NEUROPLAN — Orientación experta en neurodesarrollo infantil"
- Descripción enfocada a familias.
- `og:title`, `og:description`, `og:type`, `twitter:card`.
- Reemplazar los placeholders "Lovable App" / "Lovable Generated Project".

### 3. PWA instalable
- Crear `public/manifest.webmanifest` (name, short_name, start_url `/`, display `standalone`, theme_color `#1A858D`, background_color `#FFFFFF`).
- Iconos PWA en `public/icons/` (192, 512, maskable 512, apple-touch-icon 180) derivados del logo existente.
- En `__root.tsx`: `<link rel="manifest">`, `<meta name="theme-color">`, `apple-touch-icon`.
- Sin service worker en Fase 1.

### 4. Landing pública `/` (solo padres de familia)
Reemplaza el placeholder actual de `src/routes/index.tsx`:
- **Header** minimalista sticky: logo NEUROPLAN + botón "Ingresar".
- **Hero**: headline serif, subtítulo corto, un solo CTA "Comenzar evaluación gratuita". Sin retrato de Moholka aquí.
- **Cómo funciona**: 3 pasos numerados (Evaluación → Resumen gratuito → Plan personalizado) con íconos lineales, sin imágenes de personaje.
- **Para quién es**: bloque breve orientado a familias con niños con desafíos del neurodesarrollo.
- **Preguntas frecuentes**: 3–4 items en acordeón.
- **CTA final** + **Footer** minimalista.
- Nada dirigido a profesionales/neuropsicólogos en la landing pública.

### 5. Autenticación (UI shell, sin backend)
Diseño alineado a la referencia adjunta (tabs Login/Register, inputs con ícono + label flotante, botón píldora, sección "O ingresa con").

- `src/routes/auth.tsx`: pantalla única con tabs `Login` / `Register`.
  - **Login**: email, password (con ojito), "Recuérdame", "¿Olvidaste tu contraseña?", botón "Ingresar".
  - **Register**: nombre, email, password, **selector de rol** con dos opciones:
    - `Soy padre / madre` (rol `usuario`)
    - `Soy neuropsicólogo` (rol `administrador`)
    - Botón "Crear cuenta".
  - Sección "O continúa con" — botón Google (mock por ahora, sin lógica real).
- Toda la lógica de auth queda mockeada en Fase 1 (se conectará a Lovable Cloud en Fase 2, incluyendo el mapeo de roles a la tabla `user_roles`).

### 6. Onboarding post-registro
- `src/routes/onboarding.tsx`: pantalla de bienvenida minimalista.
  - Mensaje: "Bienvenido/a a NEUROPLAN. Estamos preparando tu evaluación."
  - CTA "Comenzar" que apunta al futuro flujo de evaluación.
  - **No** se menciona ni introduce a Moholka aquí — Moholka aparece más adelante, guiando la evaluación en Fase 2.

### 7. Componentes reutilizables
- `src/components/brand/logo.tsx`
- `src/components/landing/header.tsx`
- `src/components/landing/footer.tsx`
- `src/components/auth/auth-tabs.tsx`
- `src/components/auth/floating-input.tsx` (input con ícono a la izquierda y label flotante, estilo de la referencia)
- `src/components/auth/role-selector.tsx` (dos tarjetas seleccionables: Padre/Madre y Neuropsicólogo)

### 8. Imágenes
No se generan imágenes en esta fase. Se dejará documentado en `src/lib/image-bank.ts` un mapa vacío donde luego se enchufará el banco de imágenes prediseñadas del informe.

## Fuera de alcance (siguientes fases)
- Lovable Cloud (Supabase): tablas, RLS, tabla `user_roles`, auth real, Google OAuth real.
- Moholka (chat IA guiando la evaluación) — aparece post-registro.
- Motor de evaluación en 3 módulos.
- Generación de Resumen Inteligente y Plan Interactivo Personalizado.
- Panel del neuropsicólogo (administrador) + CRM CEREBRO.
- Pagos y membresía.
- Service worker / offline.

## Verificación
- `bun run build` sin errores.
- Preview móvil: landing sin bloque de profesionales ni mención de Moholka; `/auth` con estética minimalista tipo referencia y selector de rol; `/onboarding` sin Moholka.
- Manifest y iconos reconocidos como PWA.

---

Aprobá este plan para pasar a build mode y comenzar la implementación.