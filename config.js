// ─── Configuración de la web de Bachillerato ─────────────────────────────────
// Los exámenes se guardan en la hoja de Google y en los calendarios de Google de cada clase
// a través del Apps Script (apiUrl). El profesorado entra con Microsoft 365 por el Supabase común
// «Acceso Microsoft 365» (el mismo de Horarios, Control de baños, Reserva de espacios…).
// El alumnado no necesita iniciar sesión para ver el calendario.
window.APP_CONFIG = {
  // Apps Script: Implementar > Gestionar implementaciones > URL de la aplicación web (/exec)
  apiUrl: "https://script.google.com/macros/s/AKfycbxT0BbgNZDVep0SXRINgpK1WQffJWSOUPnFIIUINETAFRmKF9jwgde8BEy_F7xfpkgv/exec",

  supabaseUrl: "https://hblayjaknhfxieqbzrlq.supabase.co",
  // Clave «anon» pública (no pasa nada por verla)
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibGF5amFrbmhmeGllcWJ6cmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjg0ODEsImV4cCI6MjEwNjgwNDQ4MX0.K2iWyQAt9upNBXUhdZuV-Nle9fkCMYgQ6jTBBO0MluE",

  dominio: "salesianas.org",          // solo pueden añadir exámenes cuentas de este dominio
  dominiosExtra: ["salesianes.org"],  // otros dominios del mismo Microsoft 365 del colegio

  portal: "https://claustro-utilidades.vercel.app/",
};
