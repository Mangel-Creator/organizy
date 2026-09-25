@AGENTS.md

# Organizy

App para organizar el día a día de una persona que mezcla vida personal,
amigos y clientes: calendario, avisos, planes con amigos y clientes, tráfico y
alarmas. En español de España.

## Para quién y dónde funciona (decidido el 23/09/2026)

- **Para todo el mundo**, y **cada usuario solo ve sus datos**: todo se guarda en su
  dispositivo (AsyncStorage/SQLite). No hay servidor con datos de usuarios.
- **Un solo código, dos versiones:**
  - **Web** para el resto de la gente: https://mangel-creator.github.io/organizy/
    Se publica sola con GitHub Actions (`.github/workflows/pages.yml`) al subir a
    `main`. Se añade a la pantalla de inicio como app web (`src/app/+html.tsx`).
    `baseUrl` es `/organizy` (en `app.json`); en desarrollo la web está en
    `http://localhost:8081/`.
    La web **se actualiza sola** (`src/services/actualizacionWeb.ts`): al abrirla, o al
    volver tras 30 s fuera, compara el archivo principal publicado con el que usa y,
    si ha cambiado, recarga (una vez por versión, sin bucles).
  - **App** para el dueño, en su iPhone con Expo Go (cuenta de Expo `mangel_creator`,
    proyecto vinculado con `eas init`). En el futuro, app en las tiendas.
- **Lo que no puede hacer la web** (quedará solo para la app): alarma que suena como
  despertador con el móvil bloqueado, widget y voz sin abrir la app (en web, como
  mucho, un Atajo del iPhone). En web lo que no funcione se oculta o se avisa.
- Avisos en web: solo con la web añadida a la pantalla de inicio y con un servidor
  pequeño de notificaciones push. La fase 4 se hizo sin servidor, así que en la web
  no hay avisos (Perfil lo explica); los push web quedan pendientes para más adelante.
- Funciones que necesiten claves secretas (IA, WhatsApp Business) irán detrás de un
  servidor pequeño propio, nunca dentro de la app.
- Instalar en el iPhone una versión propia (alarmas, widget, voz) exige la cuenta
  de desarrollador de Apple (99 €/año). Avisar al usuario al llegar a esas fases.

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

### Indicaciones del usuario entre sesiones (lo más importante)

El usuario trabaja con varias sesiones abiertas a la vez (una por fase o tema).
Sus indicaciones mandan sobre el prompt de la fase, **dijera lo que dijera en la
sesión que fuera**:

- Si en una sesión da una indicación que afecta al proyecto en general (qué es la
  app, para quién, diseño, forma de trabajar, decisiones técnicas), apúntala en
  este archivo (en su sección o en "Decisiones del usuario"), haz commit en `main`
  y avisa a las otras sesiones de Organizy que estén abiertas (ListAgents +
  SendMessage) con un resumen corto.
- Si solo afecta a lo que se hace en esa sesión, no hace falta compartirla.
- Si afecta solo a otra sesión concreta, díselo solo a esa sesión.
- Al empezar o retomar trabajo, relee este archivo en `main`: puede haber cambiado
  desde otra sesión.
- Si una indicación nueva choca con otra anterior, manda la más reciente; si hay
  duda, pregunta al usuario.

### Decisiones del usuario

- 23/09/2026 — App para todo el mundo con los datos de cada usuario privados; web
  para los demás y app para el dueño (ver "Para quién y dónde funciona").
- 24/09/2026 — Direcciones en la web con OpenStreetMap.
- 24/09/2026 — Sus indicaciones valen para todas las sesiones (ver arriba).
- 24/09/2026 — Sin worktrees: se trabaja directamente en `C:\proyectos\organizy`,
  rama `main` (los worktrees obligan a reinstalar `node_modules` y a fusionar). Si
  una sesión se abre igualmente en un worktree y no deja escribir fuera de él, no
  reinstales: enlaza su `node_modules` al de la carpeta principal (junction), haz el
  commit ahí, llévalo a `main`, y al terminar quita el enlace y borra el worktree y
  su rama.
- 24/09/2026 — Carpeta del usuario ordenada en subcarpetas:
  `C:\Users\usuario\OneDrive\PERSONAL\Organizy` (índice en su `LEEME.md`). Todo lo
  que no sea código y sea para el usuario va a su subcarpeta, nunca suelto en la raíz:
  `Prompts` (PDF originales y prompts añadidos), `Guías de prueba`
  (`Fase NN - Nombre.md`, una por fase), `Diseño`, `Capturas` (subcarpeta `Fase NN`),
  `QR y enlaces` (QR y `Enlaces.md`) y `Notas y decisiones` (`Fase NN - Resumen.md`).
  Si algo no encaja, crea una subcarpeta con nombre claro y añádela al `LEEME.md`.
  Al terminar cada fase, guarda ahí su guía de prueba y su resumen. El código sigue
  solo en `C:\proyectos\organizy`.
- 24/09/2026 — La web se actualiza sola al publicar una versión nueva (ver "Para
  quién y dónde funciona").
- 24/09/2026 — Diseño "cuaderno cálido" con una regla: cada color significa una sola
  cosa (azul tinta = pulsar, naranja = Clientes, verde = Amigos, negro = Yo, granate =
  aviso). Cada persona elige la densidad en Perfil > "Cómo se ve" (por defecto
  Equilibrado). Alguna animación suave, sin excesos. Ver "Diseño" y `BRIEF.md`.
- 25/09/2026 — Todavía no quiere la cuenta de desarrollador de Apple (99 €/año) ni una
  app propia en el iPhone (**corregido más abajo, el mismo día: sí quiere app propia
  además de la web, y la subirá a Apple en el futuro**). Mientras tanto: en el día a día usa la web añadida a la
  pantalla de inicio (funciona con cualquier wifi y se actualiza sola, pero sin avisos
  ni alarmas) y prueba la app en Expo Go con modo túnel (necesita el ordenador
  encendido con el servidor en marcha). Expo Go no puede cargar actualizaciones de
  EAS Update, así que sin app propia no hay forma de usar la app sin el ordenador. No
  propongas de nuevo la cuenta de Apple salvo en las fases que la necesiten de verdad
  (alarmas, widget, voz) o si el usuario lo pide.
- 25/09/2026 — Fase 7 (Alarmas): la pestaña se hace completa (despertador, hora de
  dormir, salida e inteligente) con tres niveles detrás de una misma interfaz:
  **app propia** con alarmas de verdad (AlarmKit en iOS 26+, AlarmManager en Android),
  que se programa ya aunque solo se pueda probar cuando haya build de EAS (ajustada por
  la entrada siguiente: se construye como app de verdad); **Expo Go**, avisos locales
  con sonido (no suenan con el móvil en silencio); **web**, se explica y se ofrece
  crear la alarma en el Reloj del iPhone con un Atajo.
- 25/09/2026 (corrige la entrada "Todavía no quiere… ni una app propia") — **Quiere app
  propia y web.** Organizy se construye como app de verdad (todo lo que la web no puede
  hacer se hace igualmente para la app) además de la web, y **en el futuro la subirá a
  Apple** (App Store/TestFlight con la cuenta de desarrollador). Lo que no cambia: la
  cuenta de Apple se paga más adelante, cuando él lo decida; hasta entonces la app se
  prueba en Expo Go con túnel y en el día a día usa la web. Tenerla instalada en el
  iPhone sin el ordenador exige esa cuenta (no hay vía gratis desde Windows). Prepara
  el código para ese paso (app.json, permisos, EAS) sin obligarle a pagar antes.
- 25/09/2026 — Fase 6 (Mapa): la pestaña Mapa es **como una app dentro de Organizy**,
  totalmente funcional para el tráfico, **con Waze como modelo**: radares en el mapa, la
  carretera pintada según el tráfico (libre, poco denso, muy denso, atasco) y rutas con
  el tráfico real. Lo que Waze saca de su comunidad de conductores (policía, accidentes
  avisados por otros usuarios) no se puede copiar sin usuarios que compartan datos:
  se sustituye por fuentes abiertas (radares fijos de la DGT u OpenStreetMap,
  incidencias de la DGT) y se le explica. Las claves de los proveedores de tráfico van
  detrás del servidor, nunca en la app. **Los colores del tráfico sobre la carretera son
  la única excepción** a "cada color significa una sola cosa", y solo dentro del mapa
  (son el código que todo el mundo reconoce); fuera del mapa la regla sigue igual.
- 25/09/2026 (más tarde; **anulado en la entrada siguiente**) — Había elegido pagar
  ya la cuenta de desarrollador de Apple para tener la app propia en el iPhone sin
  depender del ordenador. Plan: (1) él se da de alta en el Apple Developer Program
  (lo hace y lo paga él; Apple puede tardar hasta 48 h en activarla); (2) cuando esté
  activa, la sesión "Organizy · 02 Bienvenida" (o la que él diga) prepara app.json
  (bundleIdentifier), expo-updates y la build con EAS, y la manda a TestFlight;
  (3) después, las mejoras le llegan con EAS Update sin reinstalar. Las credenciales
  de Apple las escribe siempre él en su terminal; nunca en el código ni en el chat.
  Hasta que esté activa, sigue con la web y Expo Go con túnel.
- 25/09/2026 (última palabra, anula la anterior) — **No quiere pagar todavía la cuenta
  de Apple (99 €/año).** Quiere probar la app él mismo y, en el futuro, sacarla
  (App Store). Hasta entonces: la app se prueba en Expo Go con el túnel (solo con el
  ordenador encendido) y en el día a día usa la web. Organizy se sigue construyendo
  como app de verdad y preparada para ese paso. No le propongas pagar la cuenta salvo
  que lo pida o una fase la necesite de verdad; si pregunta cómo usar la app sin el
  ordenador, recuérdale que solo se puede con esa cuenta (o con la web).

## Cómo prueba el usuario en el iPhone

- **A diario, la web** en la pantalla de inicio: funciona con cualquier wifi o datos,
  sin el ordenador, y se actualiza sola en cuanto una sesión sube a `main`. Por eso
  **cada sesión, al terminar, sube su trabajo a `main`** (con tsc, lint y pruebas
  pasando) y comprueba con `gh run list` que se ha publicado.
- **La app, en Expo Go con túnel**, siempre con la **misma dirección**:
  `exp://uv-pnzw-mangel_creator-8083.exp.direct`. Sale de `.expo/settings.json`
  (`urlRandomness`, no está en git: no lo borres) más el puerto 8083 y la cuenta de
  Expo `mangel_creator` con la que está iniciada la sesión de Expo CLI.
  - Arráncalo con `preview_start` y el nombre `organizy-tunel` (`.claude/launch.json`).
    Vale desde cualquier sesión, también desde un worktree: usa las rutas de
    `C:\proyectos\organizy`. Nunca con otro puerto: cambiaría la dirección.
  - Solo una sesión a la vez: si el puerto 8083 ya está en uso, el túnel ya está en
    marcha y no hay que hacer nada.
  - En el iPhone: Expo Go → "Development servers" → Organizy, o escribir la dirección
    en Safari.
  - Funciona con cualquier wifi o datos, pero **solo con el ordenador encendido** y el
    túnel en marcha. Los avisos ya programados siguen llegando aunque el ordenador
    esté apagado (hasta 7 días); lo que necesita el ordenador es abrir la app.
- **App propia sin el ordenador**: solo con la cuenta de desarrollador de Apple (ver
  la decisión del 25/09/2026). Ya está `eas.json` con los perfiles `preview`
  (instalación directa en su iPhone) y `production` (TestFlight/App Store), cada uno
  con su canal. **No instales todavía `expo-updates`** ni pongas `runtimeVersion` o
  `updates.url` en `app.json`: Expo Go no carga esas publicaciones y dejaría de
  funcionar el túnel (lo comprobó la sesión 02 el 24/09). Plan para cuando tenga la
  cuenta, en este orden:
  1. `npx expo install expo-updates` y `npx eas-cli@latest update:configure`.
  2. `npx eas-cli@latest build --profile preview --platform ios` (el usuario registra
     su iPhone con `eas device:create` y entra con su cuenta de Apple; nunca le pidas
     la contraseña).
  3. Un workflow de GitHub que, al subir a `main`, ejecute
     `npx eas-cli@latest update --channel preview --auto`. Necesita el secreto
     `EXPO_TOKEN` en GitHub, que crea y pega el propio usuario (expo.dev → Access
     tokens); nunca lo escribas tú.
  4. Desde entonces la app se actualiza sola al abrirla, sin el ordenador.

## Tecnología

- Expo SDK 57 (React Native 0.86) con TypeScript.
- Expo Router (rutas en `src/app/`), pestañas con `Tabs` de `expo-router`.
- Iconos: `@expo/vector-icons` (Ionicons).
- Letras: `@expo-google-fonts/fraunces` y `@expo-google-fonts/dm-sans`.
- Guardado local: AsyncStorage (ajustes) y expo-sqlite (datos como eventos; en la
  web, AsyncStorage: ver "Fase 3").
- Se prueba con Expo Go mientras no haga falta código nativo propio.
- Instala librerías siempre con `npx expo install <paquete>`.
- Pruebas automáticas con Jest (`jest-expo`): `npm test`. Están junto al código en
  carpetas `__tests__`. Importa `describe`, `it` y `expect` de `@jest/globals`
  (TypeScript 6 no carga los tipos globales solo).

## Estructura de carpetas

```
src/
  app/                 Rutas (Expo Router). Solo reexportan pantallas.
    _layout.tsx        Raíz: carga letras y perfil, tema, Stack con rutas protegidas.
    bienvenida.tsx     Formulario de bienvenida (solo si no se ha completado).
    perfil.tsx         Perfil (se abre desde el botón con la inicial en Hoy).
    evento.tsx         Ficha de evento: /evento?fecha=AAAA-MM-DD (nuevo) o ?id= (editar).
    (tabs)/_layout.tsx Barra inferior con las 5 pestañas.
    (tabs)/index.tsx   Hoy
    (tabs)/semana.tsx  Semana
    (tabs)/planes.tsx  Planes
    (tabs)/mapa.tsx    Mapa
    (tabs)/alarmas.tsx Alarmas
  screens/             Una pantalla por archivo (PantallaHoy, PantallaSemana...).
    formulario-perfil/ Piezas compartidas por Bienvenida y Perfil (campos, borrador,
                       comprobaciones y tarjetas de permisos).
    calendario/        Piezas de Hoy, Semana y la ficha de evento (FilaEvento,
                       TarjetaHueco, textos y opciones, useAhora, ConfirmacionMovidas).
    perfil/            Secciones propias de Perfil (SeccionAvisos).
  components/          Piezas reutilizables. Se importan desde '@/components'.
  theme/               Colores, letras, tamaños, espacios y radios.
  data/                Guardado local: ajustes.ts (AsyncStorage), db.ts (SQLite),
                       perfil.ts (perfil del usuario), energia.ts (energía del día),
                       avisos.ts (qué avisos están activados), eventos/ (eventos).
  services/            Lógica sin pantalla: fechas.ts (formatos en español),
                       lugares.ts (texto -> coordenadas), permisos.ts,
                       agenda/ (huecos, carga, resumen, reparto; con pruebas),
                       avisos/ (notificaciones locales; con pruebas).
```

El alias `@/` apunta a `src/`.

## Diseño

Todo sale de `src/theme/index.ts`. No escribas colores sueltos en las pantallas.
El porqué de cada decisión está en `BRIEF.md` (raíz del repositorio).

**Cada color significa una sola cosa.** No uses el naranja ni el verde para nada que
no sea un evento de Clientes o de Amigos (ni botones, ni errores, ni mensajes de "hecho").

| Uso | Token | Color |
|---|---|---|
| Fondo | `fondo` | `#F4F1EA` |
| Tarjetas | `tarjeta` | `#FFFFFF` |
| Texto principal | `texto` | `#1A1C24` |
| Texto secundario | `textoSecundario` | `#5E5A52` |
| Bordes | `borde` | `#DDD6C8` |
| Pulsar: botón principal, "+", pestaña activa, interruptores, hoy | `principal` | `#2B4BD8` (azul tinta) |
| Errores, avisos, días cargados (>80 %) | `aviso` | `#A1172F` (granate) |
| "Clientes" | `clientes` | `#C4461E` (naranja) |
| "Amigos" | `amigos` | `#16734F` (verde) |
| "Yo" (personal) | `yo` | `#1A1C24` (negro) |
| Barrita de carga normal y borde de huecos | `cargaNormal` | `#8A8374` (gris) |

Para el color de un tipo de evento usa `colorTipo[evento.tipo]` (en `theme`).

- Títulos con Fraunces (600 y 700). Resto con DM Sans (400, 500 y 700).
- Esquinas redondeadas de 14 a 18 px, mucho aire, sin degradados.
- Todo lo pulsable mide 44 px de alto como mínimo (`alturaTactil`).
- Solo modo claro.
- Nada de `opacity` para "apagar" texto (baja del contraste mínimo): quita el fondo
  blanco y usa `textoSecundario`, como las filas de eventos pasados.
- La tarjeta "Siguiente" de Hoy va del color del tipo de su evento (`colorTipo`).

### Densidad (`src/data/densidad.ts`)

Cada persona elige en Perfil > "Cómo se ve": Con aire, Equilibrado (por defecto) o
Compacto. Se guarda en `organizy:densidad`. En pantallas:
`const { medidas } = useDensidad()` (alto y relleno de fila, separación, tamaño de
texto y `pxPorHora` de Semana). Solo afecta a las listas de Hoy y a la línea de horas de
Semana; los formularios no cambian. Ninguna fila baja de 44 px.

### Movimiento

Poco y con sentido, con `react-native-reanimated` (ya viene en Expo Go): la casilla da
un pequeño salto al marcarla, las filas de Hoy se recolocan deslizándose
(`LinearTransition`) y Semana hace un fundido corto al cambiar de día. Envuelve las
listas en `<LayoutAnimationConfig skipEntering>` para que no se anime nada al abrir la
pantalla. Las animaciones de Reanimated respetan solas "reducir movimiento". Con el
React Compiler, usa `valor.get()` y `valor.set()`, no `valor.value`. Al pulsar, los
botones se hunden un poco (`scale` 0.94-0.99). Nada de pulsos ni animaciones infinitas.

### Componentes (`src/components`)

- `Boton` — `variante="principal"` (azul tinta) o `"secundario"` (blanco con borde).
- `Tarjeta` — caja blanca redondeada.
- `Titulo` — Fraunces, `nivel` 1, 2 o 3.
- `Texto` — DM Sans, con `secundario`, `fuerte` y `pequeno`.
- `CampoTexto` — campo con `etiqueta`, `ayuda` y `error` (borde y mensaje en granate, `aviso`).
- `Selector` — chips para elegir una opción; la elegida con fondo oscuro y texto claro.
- `SelectorDias` — L M X J V S D, varios a la vez (lunes = 0).
- `SelectorHora` — hora "HH:MM" con botones − y + de 15 en 15 minutos.
- `BarraProgreso` — "Paso 1 de 2" con barra azul.
- `AvisoPantallaInicio` — solo en la web del móvil: cómo añadirla a la pantalla de inicio.
- `BotonInicial` — botón redondo con la inicial del nombre (abre Perfil).
- `Pantalla` — contenedor de pantalla con fondo, márgenes y scroll. Se aparta del
  teclado (`KeyboardAvoidingView`) y admite `ref` para hacer scroll.
- `Proximamente` — relleno provisional para pestañas sin hacer.
- `BotonFlotante` — botón redondo azul con "+", fijo abajo a la derecha. Va al
  lado de `Pantalla` (no dentro), en un `View` con `flex: 1`.
- `Casilla` — casilla para marcar como hecho (44 px); da un pequeño salto al marcarla.
- `Interruptor` — fila con texto, ayuda y un interruptor sí/no.
- `SelectorFecha` — día con − y + y atajos Hoy, Mañana y En una semana.

## Idioma y formatos

- Toda la app en español de España.
- Fechas en formato español, semana empezando en lunes, horas en 24 h.
- Zona horaria del dispositivo. Usa siempre las funciones de `src/services/fechas.ts`.

## Datos

- `src/data/ajustes.ts`: `leerAjuste`, `guardarAjuste`, `borrarAjuste` (AsyncStorage,
  prefijo `organizy:`).
- `src/data/db.ts`: `obtenerBD()` abre `organizy.db` y aplica migraciones. Para crear
  tablas, añade una función al final de `MIGRACIONES` (la versión se guarda en
  `PRAGMA user_version`). Migración 1: tabla `eventos`; 2: columnas
  `lugar_tipo` y `lugar_sitio_id`; 3: `aviso_min`. Solo se usa en Android e iOS.
- `src/data/perfil.ts`: tipo `Perfil` (nombre, vivienda con coordenadas, sitios
  habituales, transporte, uso, horario, días de trabajo, cuándo rinde más y
  antelación de avisos). Se guarda en AsyncStorage (`organizy:perfil` y
  `organizy:bienvenidaCompletada`).
  - En pantallas: `const { perfil } = usePerfil()` (se actualiza solo al guardar).
  - Fuera de pantallas: `await leerPerfil()`.
  - `guardarPerfil`, `completarBienvenida`, `repetirBienvenida`.
- `src/data/eventos/`: tipo `Evento` en `tipos.ts` (título, fecha "AAAA-MM-DD",
  horas "HH:MM" o null, tipo `cliente|amigos|yo`, lugar (`LugarEvento`: casa, sitio
  por id u otro), notas, repetición, flexible + duración + hecha, foco, ejemplo).
  - En pantallas: `const { cargado, eventos } = useEventos()`.
  - Para cambiar: `guardarEvento` (crea o actualiza), `borrarEvento`, `marcarHecha`,
    `moverTareas`, `crearEventosEjemplo`, `borrarEventosEjemplo`, `nuevoId`.
  - El guardado real está en `repositorio.ts` (SQLite, móvil) y `repositorio.web.ts`
    (AsyncStorage, clave `organizy:eventos`). Metro elige el archivo según la
    plataforma; los dos cumplen el tipo `RepositorioEventos`. Nada de la web debe
    importar `db.ts`.
- `src/data/energia.ts`: `useEnergia(dia)` guarda "a-tope", "normal" o "tranqui" en
  `organizy:energia:AAAA-MM-DD`.
- `src/services/agenda/` (funciones puras, con pruebas en `__tests__`):
  `eventosDelDia`, `ocurreEnDia` (repeticiones), `tareasPendientes`,
  `calcularHuecos`, `cargaDelDia`, `fraseResumen`, `repartirTareas`,
  `siguienteEvento`, `bloqueDeFocoQuePisa`, `colocarEnCarriles`, `ventanaDelDia`,
  `resolverLugar`, `sitioTrabajo`.
  Tiempos en minutos desde medianoche (`Intervalo`).
- `src/data/avisos.ts`: `AjustesAvisos` (eventos, resumenManana, cierreDia,
  cierreSinPendientes) en `organizy:avisos`. En pantallas `useAjustesAvisos()`; para
  cambiar `cambiarAjustesAvisos({...})`.
- Evento tiene `avisoMin` (migración 3 de SQLite, columna `aviso_min`): null = la
  antelación del perfil, 0 = sin aviso. En la web, los eventos antiguos sin el campo
  se leen con null.
- Para lógica sin pantallas: `leerEventos()` / `suscribirseEventos` y
  `cargarPerfil()` / `suscribirsePerfil`.

## Fase 2: bienvenida y perfil (decisiones)

- La bienvenida sale mientras `bienvenidaCompletada` sea false. Se controla en
  `src/app/_layout.tsx` con `Stack.Protected`: al completarla, la app salta sola a
  las pestañas; con "Repetir bienvenida" (en Perfil) vuelve a salir, ya rellena.
- Pasos: 1 "Cuéntame un poco de ti", 2 "Tu ritmo" y una pantalla final que explica
  los permisos (ubicación y notificaciones) antes de pedirlos. "Ahora no" los salta.
  Si se deniegan, se activan desde Perfil ("Activar" o "Abrir Ajustes del teléfono"
  si el sistema ya no deja volver a preguntar). Micrófono y contactos: en su fase.
- Coordenadas (`src/services/lugares.ts`, `buscarCoordenadas`):
  - En el móvil, `Location.geocodeAsync` (no necesita permiso de ubicación).
  - En la web, OpenStreetMap (Nominatim), aprobado por el usuario. Solo se envía el
    texto de la dirección. Normas: como mucho 1 búsqueda por segundo (ya
    controlado), nunca buscar mientras se escribe, y mostrar la atribución
    `ATRIBUCION_OPENSTREETMAP` donde se busque.
  - Sin conexión se guarda con `coordenadas: null` y `completarCoordenadasPendientes()`
    las calcula al abrir la app. Si no encuentra un sitio, pide escribirlo de otra forma.
- Horas con botones − y + (no hay selector de hora nativo que funcione igual en
  Expo Go y en web). Días de trabajo por defecto de lunes a viernes.
- Saludo en Hoy con `saludoSegunHora` (`fechas.ts`): días de 6:00 a 13:59, tardes
  de 14:00 a 20:59 y noches el resto.
- Perfil no usa la cabecera del Stack: lleva su propio botón "Hoy" para volver, así
  el apartado del teclado no necesita calcular la altura de la cabecera.
- Librerías añadidas: `expo-location` y `expo-notifications` (con sus plugins en
  `app.json`). Las dos funcionan en Expo Go.
- Permisos por plataforma: `PERMISOS_DISPONIBLES` (`src/services/permisos.ts`). En web
  solo ubicación; si se deniega, se explica cómo activarla desde el navegador.
- En la web del móvil, Hoy muestra `AvisoPantallaInicio` (pasos para iPhone y
  Android). Se puede cerrar y no vuelve a salir. Añadirla a la pantalla de inicio
  evita que Safari borre los datos tras 7 días sin usarla.

## Fase 3: calendario, Hoy y Semana (decisiones)

- **SQLite no funciona en la web publicada**: expo-sqlite en navegador necesita
  `SharedArrayBuffer` y las cabeceras COOP/COEP, que GitHub Pages no permite. Por eso
  los eventos van a SQLite en el móvil y a AsyncStorage (localStorage) en la web,
  con la misma interfaz (`src/data/eventos/`).
- Eventos con hora fija: fin después del inicio y el mismo día (no cruzan la
  medianoche). Las tareas flexibles no tienen hora ni se repiten; tienen fecha
  prevista, duración (15, 30, 60 o 120 min) y casilla de hecha. Las de días
  anteriores sin hacer aparecen hoy.
- Repetición: cada día, cada semana (mismo día de la semana) o cada mes (mismo
  número; los meses sin ese día se saltan). Editar o borrar afecta a toda la serie.
- Lugar: "Sin lugar", "Casa" (vivienda del perfil), "Trabajo", los demás sitios
  habituales u "Otro sitio" (dirección exacta; coordenadas con `buscarCoordenadas`,
  sin conexión solo el texto). Casa y los sitios se guardan como **referencia**
  (`{ tipo: 'casa' }` o `{ tipo: 'sitio', sitioId }`), no como copia: se muestran con
  `resolverLugar(lugar, perfil)`, así que al cambiar la dirección en Perfil los
  eventos se actualizan solos. "Otro sitio" sí guarda la dirección tal cual.
- Si el perfil no tiene un sitio "Trabajo" (`sitioTrabajo`), el chip "Trabajo" de la
  ficha pide su dirección y lo crea en el perfil al guardar el evento.
- En Perfil los sitios habituales se pueden editar (botón del lápiz) conservando su
  id. Si se borra un sitio, sus eventos se quedan sin lugar.
- En la ficha y en la tarjeta "Siguiente" se ve el nombre del sitio y debajo la
  dirección; en las listas, solo el nombre.
- Eventos guardados con el formato antiguo de lugar (`{ nombre, direccion,
  coordenadas }`): se leen como "Otro sitio" (`normalizarLugar` en la web; migración
  2 de SQLite en el móvil).
- Aviso "Esto pisa tu bloque de foco. ¿Seguro?" al guardar un evento (nuevo o
  editado) que se solapa con un bloque de foco de ese día. Las confirmaciones (foco y
  borrar) son tarjetas dentro de la pantalla, no `Alert`, porque `Alert` no hace
  nada en la web.
- Hoy: fecha "Jueves 24 sept", saludo, energía, frase resumen, tarjeta "Siguiente"
  (el que está en curso o el próximo, hasta 7 días), lista con huecos y tareas.
  Huecos libres: de 1 h o más, desde ahora (redondeado al cuarto de hora) hasta la
  hora de acostarse, empezando como pronto al levantarse.
- Energía: A tope coloca las tareas primero en el momento en que rinde más
  (mañana 6-14, tarde 14-21, noche 21-24); Normal las reparte por turnos entre los
  huecos; Tranqui deja 2 y ofrece "Pasar el resto a mañana". Para colocar tareas
  valen huecos de 15 min o más. Las tareas solo muestran una hora sugerida: nunca
  mueven eventos.
- Semana: carga = (horas de eventos, sin contar dos veces lo solapado, + duración
  de tareas pendientes) / horas de jornada del perfil. Más del 80 % = naranja.
  Cambiar de semana con flechas o deslizando sobre la tira de días; "Hoy" aparece
  cuando no se está en hoy. Línea de horas a 56 px por hora; los solapados van en
  columnas; los bloques de foco en negro con "Protegido".
- Eventos de ejemplo: en modo desarrollo se crean solos la primera vez
  (`organizy:ejemplosCreados`). En Perfil > Pruebas hay botones para crearlos y
  borrarlos también en la web publicada (allí no hay modo desarrollo).
- La hora actual se refresca cada minuto (`useAhora`).

## Fase 4: avisos (decisiones)

- Notificaciones locales con expo-notifications, sin servidor. Solo en el móvil: en
  la web no se programan (el navegador no puede con la web cerrada) y Perfil > Avisos
  lo explica; la ficha de evento oculta el selector de aviso.
- `src/services/avisos/`:
  - `planificar.ts` (puro, con pruebas): `planificarAvisos(ctx)` recorre los días
    (desde ayer hasta 7 días) y llama a los `GENERADORES` activos. Quita lo pasado,
    ordena por hora y se queda con 60 (`MAX_AVISOS`; iOS admite 64).
  - `programar.ts` (móvil) y `programar.web.ts` (no hace nada): hablan con
    expo-notifications. Cada vez se borran todos los programados (menos el de
    prueba) y se vuelven a programar.
  - `index.ts`: `iniciarAvisos()` (en `_layout`) reprograma al arrancar, al volver a
    abrir la app y al cambiar eventos, perfil o ajustes (espera 0,5 s para juntar
    cambios). Solo si hay permiso y la bienvenida está hecha.
  - **Para añadir un tipo de aviso** (fase 4b: inicio de bloque, fin del descanso,
    hora de dormir...): añade el tipo en `tipos.ts`, su interruptor en
    `data/avisos.ts` y un generador `(ctx, dia) => AvisoPlanificado[]` en `GENERADORES`.
    Si lleva botones, crea su categoría en `prepararAvisos()`.
- Aviso de evento: "En 30 min: Reunión con Laura en Oficina" y la hora debajo. Uno
  por cada repetición. Antelación: la del evento o la del perfil (10, 30 o 60 min).
  En la ficha, si eliges la misma que el perfil se guarda null (sigue al perfil).
- Resumen de la mañana a la hora de levantarse: `fraseDeLaManana` usa `fraseResumen`
  de Hoy (huecos de todo el día) y añade "Hoy va justo, mejor no metas nada más." si
  la carga pasa del 80 % (la misma cuenta que Semana).
- Cierre del día una hora antes de acostarse (si se acuesta después de medianoche,
  cae de madrugada). Con tareas pendientes: "Te quedaron 2 cosas: ... ¿Las paso a
  mañana?" con botones "Sí, a mañana" y "Abrir". Sin pendientes: buenas noches o
  nada (ajuste `cierreSinPendientes`).
- **"Sí, a mañana" abre la app**: iOS (y Expo Go) no deja ejecutar código de la app
  desde un botón de la notificación si está cerrada. Al abrirse pasa al momento las
  tareas que sigan pendientes ese día y enseña Hoy con "Hecho: he pasado N tareas a
  mañana" (`/?movidas=N`, `ConfirmacionMovidas`). Con una versión propia se podría
  hacer sin abrir la app (tarea en segundo plano).
- Al tocar un aviso: evento -> su ficha; resumen y cierre -> Hoy. Se escucha en
  `_layout.tsx` con `escucharRespuestas` (también el aviso que abrió la app cerrada).
- Perfil > Avisos (`screens/perfil/SeccionAvisos.tsx`): interruptores por tipo, aviso
  con botón si no hay permiso, número de avisos programados y botones de prueba que
  llegan en 5 s: "Enviar un aviso de prueba", "Probar el resumen de la mañana" y
  "Probar el cierre del día" (`probarAvisoDeHoy`: el aviso de hoy tal cual, con sus
  botones). Hacen falta porque las horas van de 15 en 15 min y no se puede poner la
  hora de levantarse "dentro de 2 minutos".
- Android: canal "avisos" de importancia alta.
- **Para añadir alarmas (fase 7)** sobre este sistema (en Expo Go las alarmas son
  avisos locales con sonido, ver "Decisiones del usuario"):
  1. Cada tipo nuevo (despertador, hora de dormir, salida, inteligente) es un
     generador en `GENERADORES` (`planificar.ts`), más su tipo en `tipos.ts` y su
     interruptor en `data/avisos.ts`. Si lleva botones (posponer, apagar), crea su
     categoría en `prepararAvisos()` (`programar.ts`) y atiende la acción en
     `atenderRespuesta()` (`index.ts`).
  2. **Reserva sitio a las alarmas antes del recorte.** `planificarAvisos` se queda
     con los `MAX_AVISOS` (60) más cercanos en el tiempo: con muchos eventos, una
     alarma de dentro de unos días se quedaría fuera y no sonaría. Mete primero las
     alarmas y rellena con el resto hasta 60 (y añade una prueba de ello).
  3. `programarAvisos` borra y vuelve a programar todo, salvo los identificadores que
     empiezan por `prueba:`. Si las alarmas se programan por otra vía (AlarmKit o
     AlarmManager en la app propia), que no pasen por aquí o las borrará.
  4. Sonido: `sound: 'default'`. Un sonido propio no funciona en Expo Go y no suena
     con el móvil en silencio.

## Hoja de ruta

- [x] 1. Base: proyecto, pestañas y diseño.
- [x] 2. Formulario de bienvenida y perfil.
- [x] 3. Calendario: pantallas Hoy y Semana.
- [x] 4. Avisos (notificaciones).
- [ ] 4b. Época dorada: modo para exámenes o épocas de trabajo intenso (prompt en C:\Users\usuario\OneDrive\PERSONAL\Organizy\Prompts\Organizy-04b-epoca-dorada.md)
- [ ] 5. Captura rápida con IA.
- [ ] 6. Mapa, tráfico, radares y rutas.
- [ ] 7. Alarmas.
- [ ] 8. Planes con WhatsApp y votación.
- [ ] 9. Voz sin abrir la app y widget.
- [ ] 10. Recordatorios a clientes por WhatsApp Business (opcional).
