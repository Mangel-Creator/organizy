@AGENTS.md

# Organizy

App móvil para organizar el día a día de una persona que mezcla vida personal,
amigos y clientes: calendario, avisos, planes con amigos y clientes, tráfico y
alarmas. Es para uso propio del usuario, en español de España.

## Normas de trabajo

- El usuario es principiante: explica las cosas en español sencillo y paso a paso.
- Si algo no se puede hacer como se pide, dilo antes de empezar y propón la
  alternativa más sencilla.
- Si el usuario tiene que hacer algo fuera del código (crear una cuenta, conseguir
  una clave, instalar algo), para y explícaselo paso a paso.
- Nunca escribas claves secretas en el código de la app ni las subas a git.
- No rehagas lo que ya funciona. Cambios pequeños y probados.
- Antes de dar algo por terminado: `npx tsc --noEmit` sin errores.
- Windows + PowerShell 5.1: encadena comandos con `;`, no con `&&`.

## Tecnología

- Expo SDK 57 (React Native 0.86) con TypeScript.
- Expo Router (rutas en `src/app/`), pestañas con `Tabs` de `expo-router`.
- Iconos: `@expo/vector-icons` (Ionicons).
- Letras: `@expo-google-fonts/fraunces` y `@expo-google-fonts/dm-sans`.
- Guardado local: AsyncStorage (ajustes) y expo-sqlite (datos como eventos).
- Se prueba con Expo Go mientras no haga falta código nativo propio.
- Instala librerías siempre con `npx expo install <paquete>`.

## Estructura de carpetas

```
src/
  app/                 Rutas (Expo Router). Solo reexportan pantallas.
    _layout.tsx        Raíz: carga letras y perfil, tema, Stack con rutas protegidas.
    bienvenida.tsx     Formulario de bienvenida (solo si no se ha completado).
    perfil.tsx         Perfil (se abre desde el botón con la inicial en Hoy).
    (tabs)/_layout.tsx Barra inferior con las 5 pestañas.
    (tabs)/index.tsx   Hoy
    (tabs)/semana.tsx  Semana
    (tabs)/planes.tsx  Planes
    (tabs)/mapa.tsx    Mapa
    (tabs)/alarmas.tsx Alarmas
  screens/             Una pantalla por archivo (PantallaHoy, PantallaSemana...).
    formulario-perfil/ Piezas compartidas por Bienvenida y Perfil (campos, borrador,
                       comprobaciones y tarjetas de permisos).
  components/          Piezas reutilizables. Se importan desde '@/components'.
  theme/               Colores, letras, tamaños, espacios y radios.
  data/                Guardado local: ajustes.ts (AsyncStorage), db.ts (SQLite),
                       perfil.ts (perfil del usuario).
  services/            Lógica sin pantalla: fechas.ts (formatos en español),
                       lugares.ts (texto -> coordenadas), permisos.ts.
```

El alias `@/` apunta a `src/`.

## Diseño

Todo sale de `src/theme/index.ts`. No escribas colores sueltos en las pantallas.

| Uso | Color |
|---|---|
| Fondo | `#F3EFE6` |
| Tarjetas | `#FFFFFF` |
| Texto principal | `#1C1B18` |
| Texto secundario | `#5E5A52` |
| Bordes | `#D9D2C3` |
| Principal y "Clientes" | `#D2461E` (naranja) |
| "Amigos" | `#16734F` (verde) |
| "Yo" (personal) | `#1C1B18` (negro) |

- Títulos con Fraunces (600 y 700). Resto con DM Sans (400, 500 y 700).
- Esquinas redondeadas de 14 a 18 px, mucho aire, sin degradados.
- Todo lo pulsable mide 44 px de alto como mínimo (`alturaTactil`).
- Solo modo claro.

### Componentes (`src/components`)

- `Boton` — `variante="principal"` (naranja) o `"secundario"` (blanco con borde).
- `Tarjeta` — caja blanca redondeada.
- `Titulo` — Fraunces, `nivel` 1, 2 o 3.
- `Texto` — DM Sans, con `secundario`, `fuerte` y `pequeno`.
- `CampoTexto` — campo con `etiqueta`, `ayuda` y `error` (borde y mensaje en naranja).
- `Selector` — chips para elegir una opción; la elegida con fondo oscuro y texto claro.
- `SelectorDias` — L M X J V S D, varios a la vez (lunes = 0).
- `SelectorHora` — hora "HH:MM" con botones − y + de 15 en 15 minutos.
- `BarraProgreso` — "Paso 1 de 2" con barra naranja.
- `BotonInicial` — botón redondo con la inicial del nombre (abre Perfil).
- `Pantalla` — contenedor de pantalla con fondo, márgenes y scroll. Se aparta del
  teclado (`KeyboardAvoidingView`) y admite `ref` para hacer scroll.
- `Proximamente` — relleno provisional para pestañas sin hacer.

## Idioma y formatos

- Toda la app en español de España.
- Fechas en formato español, semana empezando en lunes, horas en 24 h.
- Zona horaria del dispositivo. Usa siempre las funciones de `src/services/fechas.ts`.

## Datos

- `src/data/ajustes.ts`: `leerAjuste`, `guardarAjuste`, `borrarAjuste` (AsyncStorage,
  prefijo `organizy:`).
- `src/data/db.ts`: `obtenerBD()` abre `organizy.db` y aplica migraciones. Para crear
  tablas, añade una función al final de `MIGRACIONES` (la versión se guarda en
  `PRAGMA user_version`). Aún no hay tablas.
- `src/data/perfil.ts`: tipo `Perfil` (nombre, vivienda con coordenadas, sitios
  habituales, transporte, uso, horario, días de trabajo, cuándo rinde más y
  antelación de avisos). Se guarda en AsyncStorage (`organizy:perfil` y
  `organizy:bienvenidaCompletada`).
  - En pantallas: `const { perfil } = usePerfil()` (se actualiza solo al guardar).
  - Fuera de pantallas: `await leerPerfil()`.
  - `guardarPerfil`, `completarBienvenida`, `repetirBienvenida`.

## Fase 2: bienvenida y perfil (decisiones)

- La bienvenida sale mientras `bienvenidaCompletada` sea false. Se controla en
  `src/app/_layout.tsx` con `Stack.Protected`: al completarla, la app salta sola a
  las pestañas; con "Repetir bienvenida" (en Perfil) vuelve a salir, ya rellena.
- Pasos: 1 "Cuéntame un poco de ti", 2 "Tu ritmo" y una pantalla final que explica
  los permisos (ubicación y notificaciones) antes de pedirlos. "Ahora no" los salta.
  Si se deniegan, se activan desde Perfil ("Activar" o "Abrir Ajustes del teléfono"
  si el sistema ya no deja volver a preguntar). Micrófono y contactos: en su fase.
- Coordenadas con `Location.geocodeAsync` (`src/services/lugares.ts`). Solo funciona
  en Android e iOS y no necesita permiso de ubicación. En el navegador se guarda el
  texto sin coordenadas (`coordenadas: null`) y, al abrir la app en el móvil,
  `completarCoordenadasPendientes()` las calcula. Si no encuentra un sitio, pide
  escribirlo de otra forma.
- Horas con botones − y + (no hay selector de hora nativo que funcione igual en
  Expo Go y en web). Días de trabajo por defecto de lunes a viernes.
- Saludo en Hoy con `saludoSegunHora` (`fechas.ts`): días de 6:00 a 13:59, tardes
  de 14:00 a 20:59 y noches el resto.
- Perfil no usa la cabecera del Stack: lleva su propio botón "Hoy" para volver, así
  el apartado del teclado no necesita calcular la altura de la cabecera.
- Librerías añadidas: `expo-location` y `expo-notifications` (con sus plugins en
  `app.json`). Las dos funcionan en Expo Go. En web, las notificaciones salen
  como "No disponible en este dispositivo".

## Hoja de ruta

- [x] 1. Base: proyecto, pestañas y diseño.
- [x] 2. Formulario de bienvenida y perfil.
- [ ] 3. Calendario: pantallas Hoy y Semana.
- [ ] 4. Avisos (notificaciones).
- [ ] 5. Captura rápida con IA.
- [ ] 6. Mapa, tráfico, radares y rutas.
- [ ] 7. Alarmas.
- [ ] 8. Planes con WhatsApp y votación.
- [ ] 9. Voz sin abrir la app y widget.
- [ ] 10. Recordatorios a clientes por WhatsApp Business (opcional).
