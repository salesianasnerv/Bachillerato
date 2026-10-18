# Bachillerato · Escuelas Salesianas María Auxiliadora (Nervión)

Una sola web para el alumnado y el profesorado de Bachillerato (sustituye a *Bachillerato-Alumnado* y *Bachillerato-Profesorado*):

- **Exámenes › Calendario**: los exámenes por clase e itinerario (rejilla en el ordenador, lista en el móvil, impresión en A4).
- **Exámenes › Suscripción a calendario**: los calendarios de Google de cada clase (Google / iPhone / Outlook).
- **PEvAU**: enlaces a la Universidad de Sevilla y al Distrito Único Andaluz.

El alumnado no inicia sesión. El profesorado entra con **Microsoft 365** (botón «Acceso profesorado») para añadir,
editar o eliminar exámenes. Ya no hay clave compartida.

## Cómo funciona

- Los exámenes siguen en la **hoja de Google** y en los **4 calendarios de Google** de cada clase, a través del mismo Apps Script.
- El inicio de sesión usa el Supabase común **«Acceso Microsoft 365»** (el de Horarios, Control de baños, Reserva de espacios…).
- La web envía al Apps Script el token de la sesión; el Apps Script pregunta a Supabase de quién es y solo acepta
  cuentas `@salesianas.org` / `@salesianes.org`. En la hoja queda apuntado quién hizo el último cambio (columna `updatedBy`).

## Puesta en marcha (una sola vez)

1. **Apps Script**: abre la hoja de exámenes → *Extensiones → Apps Script*, sustituye todo el código por
   `../Apps Script/Code.gs` y guarda. Después *Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar*
   (no «Nueva implementación», que cambiaría la URL). La primera vez pedirá permiso para «conectarse a un servicio externo»: acéptalo.
   En la hoja, escribe `updatedBy` en la celda **I1**.
   > Desde ese momento la web antigua del profesorado deja de poder guardar (pedía la clave). La del alumnado sigue funcionando.
   > La propiedad `CLAVE_PROFESORADO` ya no se usa y se puede borrar.
2. **GitHub**: crea el repositorio `salesianasnerv/bachillerato-nervion` y sube el contenido de esta carpeta.
3. **Vercel**: *Add New → Project* → importa el repositorio → *Framework Preset: Other* → *Deploy*.
   En *Settings → Domains* deja la dirección `bachillerato-nervion.vercel.app`.
4. **Supabase** (proyecto «Acceso Microsoft 365») → *Authentication → URL Configuration → Redirect URLs*:
   añade `https://bachillerato-nervion.vercel.app/` (no cambies la *Site URL*).
5. **Portal de utilidades**: cambia los enlaces de las dos webs antiguas por `https://bachillerato-nervion.vercel.app/`
   (y, si se quiere, la app de Teams «Exámenes Bachillerato»). Cuando todo funcione, se pueden archivar los repos antiguos.

## Cada curso

Solo hay que revisar `datos.js`: clases e itinerarios, profesorado con sus asignaturas y los calendarios de Google.

## Archivos

```
index.html   Página (cabecera, menú Exámenes / PEvAU, diálogos)
styles.css   Estilos (paleta corporativa, modo oscuro, impresión)
app.js       Calendario, filtros, inicio de sesión, guardar exámenes, suscripción, impresión
config.js    Dirección del Apps Script y del Supabase común
datos.js     Datos del curso
sw.js        App instalable y sin conexión (cachés con prefijo «bachillerato-»)
```
