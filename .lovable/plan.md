## Diagnóstico

Revisé los logs de auth y las peticiones de red. Lo que está pasando:

1. **"Crear cuenta" no hace nada visible** → el servidor sí responde, pero con `422 weak_password` ("Password is known to be weak and easy to guess"). La contraseña `123456` fue rechazada por la protección **HIBP (Have I Been Pwned)** que está activada. El `toast.error` se dispara, pero probablemente no se ve por un problema de hidratación SSR en `/auth` (hay un error de *Hydration failed* registrado que regenera el árbol y puede tragarse el toast).
2. **Login "Invalid credentials"** → como el registro nunca completó, el usuario no existe. Además, aunque se registrara, hoy el email requiere confirmación, así que el login inmediato fallaría de todas formas hasta que confirme el correo.
3. **Google se queda "pensando"** → el proveedor Google no está habilitado en el backend. El popup abre pero nunca recibe tokens.

## Plan de corrección

### 1. Backend — Auth settings
- `auto_confirm_email: true` (dev): permite login inmediato tras registro sin depender del correo.
- `password_hibp_enabled: false`: quitar el chequeo HIBP mientras se prueba el flujo (seguimos exigiendo mínimo 6 caracteres desde Supabase).
- Habilitar proveedor **Google** vía `configure_social_auth(["google"])` (usa credenciales gestionadas por Lovable Cloud, sin setup manual).

### 2. Frontend — `/auth`
- **Arreglar hidratación**: el error viene de `AuthPage` renderizando distinto en SSR vs cliente por el `useState<Tab>("login")` combinado con lectura de `Route.useSearch()`. Marcar la ruta como `ssr: false` (es una página puramente interactiva; no necesita SSR).
- **Registro (`RegisterForm`)**:
  - Mostrar el error real del servidor de forma prominente (además del toast, un banner inline dentro del formulario) para que el usuario vea "contraseña débil", "email ya registrado", etc.
  - Al éxito con `auto_confirm_email` activo: la sesión queda creada automáticamente; navegar a `/app` (el despachador ya redirige al siguiente paso: consentimiento → paciente → onboarding → evaluación).
  - Si no hay sesión (caso confirmación por correo), mostrar mensaje "Cuenta creada, revisa tu correo" y **no** navegar.
  - Validación mínima en cliente: contraseña ≥ 6 caracteres, email válido, nombre no vacío — con mensajes inline antes de golpear el servidor.
- **Login (`LoginForm`)**: banner de error inline con traducción amigable de `invalid_credentials` → "Correo o contraseña incorrectos".
- **Google (`GoogleButton`)**: envolver la llamada en try/catch, mostrar toast y banner si `result.error`, y verificar que `redirect_uri` sea `window.location.origin` (mantener) — el problema principal se resuelve al habilitar el proveedor en el backend.

### 3. Verificación
Con Playwright headless: registrar un usuario nuevo con contraseña fuerte, confirmar que se navega a `/app` → dispatcher → `/consentimiento`. Luego cerrar sesión, hacer login con las mismas credenciales, confirmar que llega al dashboard/estado correspondiente. Capturas en cada paso.

### Detalles técnicos
- Archivos a editar: `src/routes/auth.tsx` (ssr:false + banners + validación + manejo de sesión post-signUp).
- Tools backend: `supabase--configure_auth` y `supabase--configure_social_auth`.
- No se toca lógica de negocio ni el despachador `/app`.
