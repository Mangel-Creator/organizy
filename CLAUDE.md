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
    _layout.tsx        Raíz: carga letras, tema de navegación, Stack.
    (tabs)/_layout.tsx Barra inferior con las 5 pestañas.
    (tabs)/index.tsx   Hoy
    (tabs)/semana.tsx  Semana
    (tabs)/planes.tsx  Planes
    (tabs)/mapa.tsx    Mapa
    (tabs)/alarmas.tsx Alarmas
  screens/             Una pantalla por archivo (PantallaHoy, PantallaSemana...).
  components/          Piezas reutilizables. Se importan desde '@/components'.
  theme/               Colores, letras, tamaños, espacios y radios.
  data/                Guardado local: ajustes.ts (AsyncStorage), db.ts (SQLite).
  services/            Lógica sin pantalla: fechas.ts (formatos en español).
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
- `CampoTexto` — campo con `etiqueta` y `ayuda`.
- `Selector` — chips para elegir una opción; la elegida con fondo oscuro y texto claro.
- `Pantalla` — contenedor de pantalla con fondo, márgenes y scroll.
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

## Hoja de ruta

- [x] 1. Base: proyecto, pestañas y diseño.
- [ ] 2. Formulario de bienvenida y perfil.
- [ ] 3. Calendario: pantallas Hoy y Semana.
- [ ] 4. Avisos (notificaciones).
- [ ] 5. Captura rápida con IA.
- [ ] 6. Mapa, tráfico, radares y rutas.
- [ ] 7. Alarmas.
- [ ] 8. Planes con WhatsApp y votación.
- [ ] 9. Voz sin abrir la app y widget.
- [ ] 10. Recordatorios a clientes por WhatsApp Business (opcional).
