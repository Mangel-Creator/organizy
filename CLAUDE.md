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
- 25/09/2026 (sustituye al "cuaderno cálido") — El diseño anterior "se notaba mucho que
  era hecho por una IA" (sobre todo, todas las tarjetas iguales). Elegido: **"agenda
  nocturna"** con la paleta de siempre: letra IBM Plex (horas en Plex Mono), cabecera
  oscura en Hoy, filas planas con barra de color y esquinas más rectas. Y **tono cercano
  en toda la app**: nada de "Buenos días"; tuteo, frases cortas y algún giro coloquial
  suave ("¿Qué toca hoy?", "Día libre", "Ojo, esto pisa tu bloque de foco"), sin emojis
  ni exclamaciones de colega. Ver "Diseño" y `BRIEF.md`.
- 25/09/2026 — Fase 6: el tráfico sale de **TomTom** (gratis y sin tarjeta; si se pasa del
  uso gratuito deja de funcionar ese día, nunca cobra), no de Google Maps Platform (pedía
  tarjeta). El servidor es el mismo proyecto de Supabase de la fase 5. Ver "Fase 6".
- 26/09/2026 — Fase 6: el mapa se puede **ver en grande** y **guía por voz** giro a giro,
  con avisos de radares. Con el móvil bloqueado solo podrá la app propia (en la web y en
  Expo Go se mantiene la pantalla encendida; para ir con el móvil bloqueado ya, "Abrir en
  Waze"). Los radares se revisan al actualizarlos y **en el futuro se añadirán los del
  resto de España** (Cataluña, País Vasco, municipales) hasta completarla.
- 25/09/2026 — **Cada vez que se termine una parte del proyecto, la web y Expo Go tienen
  que quedar al día y funcionando** (subir a `main` y dejar el túnel en marcha con la
  app compilando para iPhone). Ver "Cómo prueba el usuario en el iPhone".
- 26/09/2026 — **La app tiene que ser mucho más visual y menos cargada.** Hoy pasa a un
  **panel de casillas grandes con icono y número** (clientes, planes, tareas, cosas tuyas
  o estudio, "Todo el día" y "Época dorada"); al tocar una, su lista sale debajo. La
  captura rápida va **plegada** (se abre con el "+"). Los formularios, cortos: lo esencial
  con casillas de icono (`SelectorVisual`) y lo opcional plegado (`Plegable`, "Más
  ajustes"). Primero, el formulario de la Época dorada. Ver "Diseño".

- 26/09/2026 — **La clave de Anthropic (IA de la captura rápida) la pondrá cuando la app esté
  terminada** (5 $ de saldo). Supabase ya está montado y desplegado. Hasta entonces la captura
  abre la ficha con la frase como título: es lo esperado. No se lo vuelvas a pedir; si
  pregunta, los pasos están en su guía "Fase 05 - Captura con IA.md".

## Cómo prueba el usuario en el iPhone

- **Al terminar cada parte del proyecto** (una fase, un bloque de trabajo, un arreglo),
  deja al día **las dos cosas**, sin que el usuario lo pida (decisión del 25/09/2026):
  1. **La web**: sube tu trabajo a `main` (con tsc, lint y pruebas pasando) y comprueba
     con `gh run list` que se ha publicado.
  2. **Expo Go**: ejecuta
     `powershell -ExecutionPolicy Bypass -File scripts\comprobar-expo-go.ps1`. Instala
     las librerías que falten, mira que el túnel responda desde internet y pide la app
     como la pediría el iPhone. Tiene que acabar en "OK". Si dice que el túnel no está
     en marcha, arráncalo (`preview_start` "organizy-tunel") y vuelve a ejecutarlo. Si
     has añadido librerías y el túnel ya estaba en marcha, reinícialo antes.
  **Por qué**: el 25/09 el usuario no podía abrir la app en Expo Go por dos cosas que
  nadie vio: el túnel se había apagado (la app de Claude apaga los servidores de
  `preview_start` cuando la sesión que los arrancó termina) y faltaba instalar una
  librería nueva de otra sesión (`@supabase/supabase-js`), así que la app no compilaba.
  Si añades una librería, **instálala también en `C:\proyectos\organizy`** aunque
  trabajes en un worktree.
- **A diario, la web** en la pantalla de inicio: funciona con cualquier wifi o datos,
  sin el ordenador, y se actualiza sola en cuanto una sesión sube a `main`.
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
- Letras: `@expo-google-fonts/ibm-plex-sans` e `@expo-google-fonts/ibm-plex-mono`.
- Guardado local: AsyncStorage (ajustes) y expo-sqlite (datos como eventos; en la
  web, AsyncStorage: ver "Fase 3").
- Se prueba con Expo Go mientras no haga falta código nativo propio.
- Alarmas de verdad: `react-native-alarm-scheduler` (solo en la app propia; en Expo Go no
  se carga, ver "Fase 7").
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
    epoca.tsx          Sección de la Época dorada: /epoca (la activa) o /epoca?id=.
    epoca-editar.tsx   Formulario de la época en 3 pasos: nueva, o ?id= (y &paso=3).
    alarma.tsx         Nueva alarma (/alarma) o editar (/alarma?id=).
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
    perfil/            Secciones propias de Perfil (SeccionAvisos, SeccionEpocas).
    epoca/             Piezas de la Época dorada (franja, Plan de hoy, formulario,
                       editores de hitos y de imprescindibles, useEpocaActiva).
    captura/           Captura rápida con IA (campo de Hoy y tarjeta de confirmación).
    mapa/              Piezas del Mapa (MapaRuta móvil y web, destinos, tarjetas, leyenda).
    alarmas/           Piezas de Alarmas (fila, tarjeta de la inteligente, salidas,
                       hora de dormir, aviso del nivel).
  components/          Piezas reutilizables. Se importan desde '@/components'.
  theme/               Colores, letras, tamaños, espacios y radios.
  data/                Guardado local: ajustes.ts (AsyncStorage), db.ts (SQLite),
                       perfil.ts (perfil del usuario), energia.ts (energía del día),
                       avisos.ts (qué avisos están activados), eventos/ (eventos),
                       epocas/ (épocas doradas y bloques marcados),
                       supabase.ts (conexión con el servidor propio),
                       salidas.ts y horasPunta.ts (tráfico calculado), radares/ (DGT),
                       alarmas.ts (alarmas, ajustes y adelantos de la inteligente).
  services/            Lógica sin pantalla: fechas.ts (formatos en español),
                       lugares.ts (texto -> coordenadas), permisos.ts,
                       agenda/ (huecos, carga, resumen, reparto; con pruebas),
                       avisos/ (notificaciones locales; con pruebas),
                       epoca/ (plan, progreso y cuenta atrás de la época; con pruebas),
                       captura/ (captura rápida con IA y validación; con pruebas),
                       rutas/ (rutas con tráfico, radares, hora de salida y horas
                       punta, navegación por voz; con pruebas), ubicacion.ts (dónde
                       estás, sin preguntar), voz.ts (hablar en voz alta),
                       alarmas/ (cuándo suena cada alarma, inteligente, alarmas de verdad
                       y Atajo de la web; con pruebas).
supabase/              Servidor propio: Edge Functions (Deno) y SQL. Ver "Servidor propio".
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
| Bordes (separadores, decorativo) | `borde` | `#DDD6C8` |
| Borde de los campos de texto | `bordeCampo` | `#958D81` |
| Cabecera oscura de Hoy / "Lo siguiente" | `tinta` / `tintaSuave` | `#1A1C24` / `#2E313C` |
| Texto sobre la cabecera | `textoSobreTinta` / `textoSecundarioSobreTinta` | `#FFFFFF` / `#B9BCC8` |
| Pulsar: botón principal, "+", pestaña activa, interruptores, hoy | `principal` | `#2B4BD8` (azul tinta) |
| Errores, avisos, días cargados (>80 %) | `aviso` | `#A1172F` (granate) |
| "Clientes" | `clientes` | `#C4461E` (naranja) |
| "Amigos" | `amigos` | `#16734F` (verde) |
| "Yo" (personal) | `yo` | `#1A1C24` (negro) |
| Barrita de carga normal y borde de huecos | `cargaNormal` | `#8A8374` (gris) |
| Solo la Época dorada (franja, bloques de estudio, días con hito) | `dorado` | `#B7892B` (texto oscuro encima) |

Para el color de un tipo de evento usa `colorTipo[evento.tipo]` (en `theme`).

- Letra IBM Plex Sans (títulos 600, texto 400, etiquetas 500, destacado 600). **Las horas
  van en IBM Plex Mono** (`fuentes.hora` y `fuentes.horaFuerte`), como un reloj.
- **Hoy empieza con una cabecera oscura** (`colores.tinta`) a todo lo ancho: fecha, saludo,
  resumen y "Lo siguiente". Dentro, texto en `textoSobreTinta` y `textoSecundarioSobreTinta`,
  y los colores de tipo en su versión clara (`colorTipoSobreTinta`): los normales no se
  ven sobre la tinta. `Pantalla colorArriba` pinta la franja de la hora.
- **Filas planas, no tarjetas**: eventos y tareas son filas blancas sin borde con una
  barra de 4 px a la izquierda (`borderLeftWidth: 4`, `borderLeftColor: colorTipo[tipo]`)
  y sin esquinas redondeadas. Las cajas (`Tarjeta`) son blancas y sin borde; solo los
  campos de texto llevan borde (`bordeCampo`).
- Esquinas más rectas: `radio.pequeno` 6 (chips, campos), `normal` 8 (botones),
  `grande` 10 (cajas); `radio.chip` (redondo) solo para interruptores y barras. Sin
  degradados.
- **Tono cercano** en todos los textos: tuteo, frases cortas, algún giro coloquial
  suave, sin emojis ni exclamaciones. Ejemplos en `BRIEF.md` > "Tono".
- Todo lo pulsable mide 44 px de alto como mínimo (`alturaTactil`).
- Solo modo claro.
- Nada de `opacity` para "apagar" texto (baja del contraste mínimo): quita el fondo
  blanco y usa `textoSecundario`, como las filas de eventos pasados.
- La tarjeta "Lo siguiente" de Hoy va dentro de la cabecera, con la barra del color de
  su tipo (`colorTipoSobreTinta`).
- **Hoy es un panel de casillas** (`screens/hoy/PanelHoy.tsx`, 26/09/2026): cabecera
  oscura (fecha, saludo, "Lo siguiente"; sin frase de resumen) y seis casillas grandes
  de dos en dos, con icono en un cuadrado de color suave (`colorBaldosa`) y número:
  clientes, planes con amigos, tareas, cosas tuyas (o bloques de estudio si hay época),
  "Todo el día" y "Época dorada" (esta abre `/epoca`). Al tocar una, su lista sale
  debajo y la casilla se pone en tinta; al tocarla otra vez, se cierra. La energía solo
  sale en Tareas y Estudio. La captura rápida está plegada: el "+" la abre (y pasa a
  "×"); dentro, "Mejor lo relleno a mano" abre la ficha vacía. Si añades algo a Hoy,
  que sea una casilla o vaya dentro de la lista de una, no un bloque suelto más.
- **Formularios cortos y visuales**: a la vista solo lo esencial, con casillas de icono
  (`SelectorVisual`) mejor que chips de texto; lo opcional, en un `Plegable` ("Más
  ajustes") con un resumen de lo que ya está puesto, que se abre solo si hay un error
  dentro. Pon valores por defecto sensatos en vez de preguntar.
- **Época dorada en Hoy: cada cosa en su caja redondeada** (petición del usuario del
  25/09/2026, porque se veía todo amontonado): cuenta atrás, "Plan de hoy", aviso de "no
  caben" y "Cómo vas" van cada uno en una `Tarjeta` aparte. Dentro del plan, lo que se
  repite (sitio, largo de bloque y descanso) se dice una vez arriba y cada bloque es una
  línea (casilla, hora en Plex Mono, examen y "Saltar"), separada por una raya fina. Sin
  líneas sueltas de descanso ni la dirección entera en cada bloque.

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
- `Tarjeta` — caja blanca y plana, sin borde.
- `Titulo` — IBM Plex Sans 600, `nivel` 1, 2 o 3.
- `Texto` — IBM Plex Sans, con `secundario`, `fuerte` y `pequeno`.
- `CampoTexto` — campo con `etiqueta`, `ayuda` y `error` (borde y mensaje en granate, `aviso`).
- `Selector` — chips para elegir una opción; la elegida con fondo oscuro y texto claro.
- `SelectorDias` — L M X J V S D, varios a la vez (lunes = 0).
- `SelectorHora` — hora "HH:MM" con botones − y + de 15 en 15 minutos.
- `BarraProgreso` — "Paso 1 de 2" con barra azul.
- `AvisoPantallaInicio` — solo en la web del móvil: cómo añadirla a la pantalla de inicio.
- `BotonInicial` — botón redondo con la inicial del nombre (abre Perfil); `sobreTinta`
  para la cabecera oscura.
- `Pantalla` — contenedor de pantalla con fondo, márgenes y scroll. Se aparta del
  teclado (`KeyboardAvoidingView`) y admite `ref` para hacer scroll. `colorArriba` pinta
  la franja de la hora y la batería (Hoy la pone en `tinta`).
- `Proximamente` — relleno provisional para pestañas sin hacer.
- `BotonFlotante` — botón azul cuadrado de esquinas suaves con "+", fijo abajo a la derecha. Va al
  lado de `Pantalla` (no dentro), en un `View` con `flex: 1`.
- `Casilla` — casilla para marcar como hecho (44 px); da un pequeño salto al marcarla.
- `Interruptor` — fila con texto, ayuda y un interruptor sí/no.
- `SelectorFecha` — día con − y + y atajos Hoy, Mañana y En una semana.
- `SelectorCantidad` — número con − y + (horas al día, horas de preparación...).
- `SelectorVisual` — como `Selector`, con casillas grandes de icono y texto (`OpcionVisual`:
  `valor`, `etiqueta`, `icono` de Ionicons y `veces` para repetirlo, como las llamas de la
  dificultad). La elegida, en tinta.
- `Plegable` — fila "Más ajustes" que se abre al tocarla; `resumen` enseña lo que ya
  está puesto y `abierto` la abre desde fuera (por ejemplo, si hay un error dentro).
- `BotonFlotante` admite `icono="close"` para cuando lo que abre ya está abierto.

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
  `lugar_tipo` y `lugar_sitio_id`; 3: `aviso_min`; 4: tablas `epocas`, `hitos` y
  `bloques_epoca` (fase 4b). Solo se usa en Android e iOS.
- `src/data/perfil.ts`: tipo `Perfil` (nombre, vivienda con coordenadas, sitios
  habituales, transporte, uso, horario, días de trabajo, cuándo rinde más y
  antelación de avisos). Se guarda en AsyncStorage (`organizy:perfil` y
  `organizy:bienvenidaCompletada`).
  - En pantallas: `const { perfil } = usePerfil()` (se actualiza solo al guardar).
  (Alarmas: `data/alarmas.ts`, ver "Fase 7": `useAlarmas()`, `guardarAlarma`,
  `borrarAlarma`, `activarAlarma`, `cambiarAjustesAlarmas`, `alternarAlarmaSalida`,
  `useAdelantos()`.)
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
- `src/data/epocas/`: tipos `Epoca`, `Hito`, `RitmoEpoca`, `Imprescindible`, `RegistroBloque`
  en `tipos.ts`. En pantallas `useEpocas()` → { cargado, epocas, registro }; fuera,
  `leerEpocas()` / `suscribirseEpocas`. Para cambiar: `guardarEpoca`, `borrarEpoca`,
  `terminarEpoca`, `marcarResumenVisto`, `marcarBloque(bloque, 'hecho'|'saltado'|null)`,
  `crearEpocaDeEjemplo`, `borrarEpocasDeEjemplo`. Guardado como los eventos:
  `repositorio.ts` (SQLite) y `repositorio.web.ts` (`organizy:epocas` y
  `organizy:bloquesEpoca`).
- `src/services/epoca/` (puro, con pruebas): `epocaActiva(epocas, dia)` (úsala para saber
  si hay época: Hoy, Semana y avisos), `estadoEpoca`, `epocaProxima`, `epocasSolapadas`,
  `ventanaEpoca`, `lugarDelDia`, `imprescindiblesDelDia`, `cuentaAtras`, `textoQuedan`,
  `planificarEpoca`, `eventoDeBloque`, `progresoHitos`, `progresoSemana`, `resumenEpoca`.

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
- Saludo en Hoy con `saludoSegunHora(fecha, nombre)` (`fechas.ts`): "¿Qué toca hoy,
  Miguel?" hasta las 13:59, "¿Qué queda hoy…?" de 14:00 a 20:59 y "¿Qué tal el día…?"
  de 21:00 a 23:59. También es el título del aviso del resumen de la mañana.
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
- Hoy: fecha "Jueves 24 sept", saludo, tarjeta "Lo siguiente" (el que está en curso o el
  próximo, hasta 7 días) y el panel de casillas (ver "Diseño"); "Todo el día" enseña la
  lista con huecos, y "Tareas", las tareas con la energía.
  Huecos libres: de 1 h o más, desde ahora (redondeado al cuarto de hora) hasta la
  hora de acostarse, empezando como pronto al levantarse.
- Energía: A tope coloca las tareas primero en el momento en que rinde más
  (mañana 6-14, tarde 14-21, noche 21-24); Normal las reparte por turnos entre los
  huecos; Tranqui deja 2 y ofrece "Pasar el resto a mañana". Para colocar tareas
  valen huecos de 15 min o más. Las tareas solo muestran una hora sugerida: nunca
  mueven eventos.
- Semana: carga = (horas de eventos, sin contar dos veces lo solapado, + duración
  de tareas pendientes) / horas de jornada del perfil. Más del 80 % = granate (`aviso`).
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
- **Alarmas (fase 7), hecho así** (ver "Fase 7"). Notas originales:
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

## Fase 4b: Época dorada (decisiones)

- Modo para exámenes o trabajo intenso, con fechas de inicio y fin. Mientras dura, Hoy,
  Semana y los avisos usan el ritmo de la época (levantarse, acostarse, horas al día)
  en vez del del perfil. Fuera de la época nada cambia. Solo una activa a la vez: si
  dos se solapan se avisa al guardar y, si se guarda igualmente, manda la que empieza antes.
- Dónde: en Hoy, la casilla "Época dorada" (con "quedan N días" si hay una activa) abre la
  sección, y la casilla de bloques de estudio enseña el plan de hoy; sección `/epoca`; en Perfil, el apartado "Épocas doradas" (activa, programadas y pasadas).
- Formulario de 3 pasos cortos (`/epoca-editar`), editable después. A la vista solo lo
  esencial; el resto, en "Más ajustes" (26/09/2026): 1 tipo (casillas con icono) y hasta
  cuándo; plegados, el nombre (si se deja vacío, `nombrePorDefecto`: "Exámenes de
  octubre") y el día que empieza (hoy). 2 dónde, horas al día y cuándo rinde más;
  plegados, horario, bloques y descanso (50 + 10 por defecto), día libre, días que va,
  sitio por día, trayecto y lo que no quiere dejar de hacer. 3 hitos: de qué es, cuándo,
  dificultad (1 a 3 llamas) y horas; plegados, la hora y el lugar.
- "Qué días vas" son los días que va al sitio de estudio; los demás estudia en casa. El
  día libre no tiene plan. Los sitios por día se eligen entre el de la época, Casa y los
  sitios habituales. Lugares como en los eventos: Casa y sitios por referencia.
- **Plan automático** (`planificarEpoca`): reparte las horas de cada hito en bloques del
  largo elegido (25, 50 o 90 min, con su descanso detrás) en los días anteriores al hito,
  dentro del horario de la época, primero en el momento en que rinde más, sin pisar
  eventos ni lo que no quiere dejar de hacer (que se ven como eventos "virtuales" con id
  `epoca-...`: al tocarlos se abre la sección). Cada bloque va al hito con más
  `puntuacion` = dificultad × horas que le quedan / días hasta su fecha. "Tranqui" ese
  día: la mitad de horas. Bloque mínimo 15 min.
- El plan no se guarda: se calcula al vuelo. Solo se guarda lo marcado (`RegistroBloque`,
  id "<época>:<día>:<minuto>"). El plan de hoy se calcula desde que empieza el día para
  que los bloques no cambien de hora. Un bloque saltado (botón "Saltar") o uno de un día
  pasado sin marcar se reparte solo en los días que quedan. Si ya no caben, se avisa
  (`faltanMin`) en Hoy y en la sección.
- Hoy durante la época: cuenta atrás al siguiente hito, "Plan de hoy" (bloques con
  casilla, "Saltar"/"Deshacer" y descansos) y progreso (semana y cada hito). Los huecos
  de "Tu día" usan el horario de la época y descuentan los bloques.
- Semana: en los días de la época, carga = ocupado / horas despierto de la época; los
  bloques salen en la línea de horas como bloques de foco con barra dorada y los días
  con hito llevan un punto dorado.
- Avisos (`services/avisos/epoca.ts`, en `GENERADORES`): hora de salir (primer bloque
  menos "tardo en llegar", solo si no estudia en casa), inicio de cada bloque, fin del
  descanso (si justo después empieza otro bloque) y "Hora de ir a dormir". Se apagan uno
  a uno en la sección (`Epoca.avisos`). En la web no hay avisos: la sección lo explica.
  La hora de salir usa un tiempo elegido a mano hasta que la fase 6 dé trayectos reales.
  **Pendiente**: la fase 6 ya los da (`calcularRutas` con `llegada` y `horaDeSalida`, ver
  "Fase 6"); conectarlo dejando el tiempo a mano como respaldo (sin servidor o en
  transporte público).
- Al terminar (o con "Terminar la época hoy") la app vuelve sola al ritmo normal y Hoy
  enseña una vez el resumen: horas hechas, bloques completados e hitos superados.
- Época de ejemplo (3 exámenes, algunos bloques hechos): en desarrollo se crea sola la
  primera vez (`organizy:epocaEjemploCreada`); en Perfil hay botones para crearla y borrarla.
- Rutas nuevas: si `tsc` se queja de `/epoca` en otra carpeta, es que `.expo/types` está
  anticuado; se regenera al arrancar `expo start`.

## Servidor propio: Supabase (desde la fase 5)

Un solo proyecto de Supabase para todo lo que necesita claves secretas (fases 5, 6, 8...).
Los datos del usuario siguen solo en su dispositivo: el servidor no guarda frases ni
eventos, solo cuenta usos.

- **Cuentas**: las crea y administra el usuario (supabase.com y console.anthropic.com).
  Nunca le pidas contraseñas ni claves secretas: las escribe él en el panel de Supabase
  o con `npx supabase secrets set` en su terminal.
- **Claves**: la dirección del proyecto y la clave **pública** (publishable,
  `sb_publishable_...`) pueden ir en la app: `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_KEY` en `.env` (no se sube; plantilla en `.env.example`) y, para la
  web publicada, variables del repositorio `SUPABASE_URL` y `SUPABASE_KEY` (Settings >
  Secrets and variables > Actions > Variables) que `pages.yml` pasa a `expo export`. Tras
  crear o cambiar `.env`, reinicia el servidor de Expo (túnel incluido). Las secretas
  (`ANTHROPIC_API_KEY`, `TOMTOM_API_KEY`, la `sb_secret_...`) solo en los secretos de Supabase.
- **En la app**: `src/data/supabase.ts`: `obtenerSupabase()` (null si no hay `.env`: la
  app funciona igual, sin lo del servidor) y `asegurarSesion(supabase)` (usuario anónimo,
  sin registro; sesión en AsyncStorage). Después `supabase.functions.invoke('nombre',
  { body, timeout })`: el token del usuario va solo en la cabecera.
- **Funciones** en `supabase/functions/<nombre>/index.ts` (Deno; `tsc` y `eslint` no miran
  la carpeta `supabase`). Piezas comunes en `supabase/functions/_shared/`: `cors.ts`
  (solo `https://mangel-creator.github.io` y `http://localhost:*`), `usuario.ts`
  (`usuarioDeLaPeticion`: comprueba el token con `auth.getUser`) y `limite.ts` (`sumarUso`:
  límite por usuario y día y otro global). Cada función lleva `verify_jwt = false` en
  `supabase/config.toml` (comprueba el usuario por dentro; así pasa el preflight CORS).
- **Base de datos**: `supabase/migrations/` (tabla `usos_diarios` y función `sumar_uso`,
  que solo puede llamar el servidor). Se aplica pegando el SQL en el SQL Editor del panel.
- **Desplegar** (desde `C:\proyectos\organizy`, con la sesión de la CLI iniciada por el
  usuario con `npx supabase login`): `npx supabase functions deploy <nombre>
  --project-ref <ref> --use-api`.
- Autenticación anónima activada en el panel (Authentication > Sign In / Providers >
  Anonymous). Supabase limita a 30 altas anónimas por hora y dirección IP.

## Fase 5: captura rápida con IA (decisiones)

- En Hoy, bajo la cabecera, campo "¿Qué apunto?" (`screens/captura/CapturaRapida.tsx`),
  **plegado** hasta tocar el "+" (`plegada`). Sigue montado aunque no se vea, así que
  `enviarFraseACaptura` funciona igual y lo despliega mientras piensa.
  Se escribe o se dicta con el micrófono del teclado. `accesorio` deja poner otro botón
  junto al de enviar (micrófono de la fase 9) y `enviarFraseACaptura(frase)` manda una
  frase desde fuera por el mismo camino.
- `services/captura/index.ts`: `interpretarFrase(frase, perfil)` envía la frase, el día y la
  hora, la zona horaria y los sitios (Casa con id `casa` y los habituales, solo id y
  nombre, sin direcciones) a la Edge Function `captura`. Nunca guarda nada.
- La función (`supabase/functions/captura`) usa **Claude Haiku 4.5** (`claude-haiku-4-5`) con
  salida estructurada (JSON con esquema). Le da un calendario de 15 días para que acierte
  "el jueves". Devuelve título, fecha, inicio, fin (1 h por defecto), tipo, `sitioId`,
  flexible, duración y confianza (alta, media, baja). Límite: 50 usos por usuario y día y
  1000 en total (secretos opcionales `CAPTURA_LIMITE_USUARIO` y `CAPTURA_LIMITE_GLOBAL`).
  En sus registros solo apunta los tokens gastados, nunca la frase.
- La app vuelve a validar el JSON (`services/captura/validar.ts`, con pruebas): fecha real
  y cercana, horas válidas, fin después del inicio y sin cruzar medianoche, tipo y sitio
  válidos (lugar por referencia, como en la fase 3). Sin hora = tarea flexible.
- Confianza alta o media: tarjeta editable "¿Lo guardo así?" (`TarjetaConfirmacion.tsx`)
  con Guardar, Cancelar y "Más opciones" (abre la ficha completa ya rellena). Avisa si
  pisa un bloque de foco.
- Sin `.env`, sin conexión, con error, al llegar al límite o con confianza baja: abre la
  ficha normal con la frase como título y un mensaje corto arriba. La ficha acepta
  `/evento?fecha=...&propuesta=<id>` con un borrador en memoria
  (`services/captura/borrador.ts`: `dejarBorrador` y `leerBorrador`), para no poner la
  frase en la dirección de la página.
- Coste aproximado: 0,2 céntimos de dólar por frase (unos 1.300 tokens de entrada y 120 de
  salida, a 1 $ y 5 $ por millón): unas 500 frases por dólar. Gasto en console.anthropic.com > Usage / Cost; conviene poner
  también un límite de gasto mensual en la consola.

## Fase 6: mapa, tráfico, radares y rutas (decisiones)

- **Tráfico con TomTom, no con Google** (lo eligió el usuario): gratis y sin tarjeta,
  2.500 peticiones al día para todos los usuarios juntos y 50.000 trozos de mapa al día;
  si se pasa, deja de responder hasta el día siguiente, nunca cobra. No calcula
  transporte público: con `transporte-publico` no se piden rutas y se ofrece Google Maps.
  Waze no da datos a otras apps: solo se abre con un enlace.
- **Claves**: `TOMTOM_API_KEY` (rutas) solo en los secretos de Supabase. Para la web hay
  otra clave de TomTom **pública**, restringida al dominio `mangel-creator.github.io` y
  solo a mapas (Map Display y Traffic tiles), en la variable del repositorio
  `TOMTOM_MAPA_KEY` → `EXPO_PUBLIC_TOMTOM_MAPA_KEY` (pages.yml); sirve para el fondo del mapa
  y la capa de tráfico de todas las carreteras. Sin ella, fondo de OpenStreetMap y solo
  los tramos de la ruta. Sin tarjeta en TomTom, un abuso no puede generar gasto.
- **Mapa**: `screens/mapa/MapaRuta.tsx` (móvil, `react-native-maps`, incluido en Expo Go:
  mapa de Apple en iPhone, sin clave, con `showsTraffic` para pintar el tráfico como Waze)
  y `MapaRuta.web.tsx` (web, Leaflet, cargado al montar porque necesita el navegador).
  Mismas props (`screens/mapa/tipos.ts`). Para la app propia en **Android** hará falta una
  clave de Google Maps SDK en el plugin de `react-native-maps` (en iPhone no).
- **Colores del tráfico** (`coloresMapa` en theme): rojo atasco, amarillo denso, ruta en
  azul, alternativas en gris y radares como círculo negro con borde blanco. Solo dentro
  del mapa (la excepción del 25/09); fuera, el "+6 min" va en granate (`aviso`).
- **Servidor** (`supabase/functions/rutas`): acción `rutas` (1 a 3 rutas con
  `maxAlternatives`, `arriveAt` para llegar a una hora o `departAt`; devuelve duración,
  sin tráfico, retraso, distancia, puntos aligerados y tramos `denso`/`atasco` según
  `magnitudeOfDelay` de las secciones de tráfico) y acción `muestras` (horas punta: una
  sola llamada por lotes, `batch/sync`, 56 peticiones). Límites: `rutas` 150 por usuario y
  2.000 en total al día; `rutas-horas-punta` 2 por usuario y 8 en total (secretos
  opcionales `RUTAS_LIMITE_*` y `HORAS_PUNTA_LIMITE_*`). Hay que desplegarla como
  `captura` (`npx supabase functions deploy rutas ...`).
- **En la app** (`src/services/rutas/`, con pruebas): `calcularRutas` (guarda 5 min en
  memoria, redondeando a ~11 m y 5 min), `radaresEnRuta` (a menos de 60 m de la línea; los
  datos no dicen el sentido), textos y enlaces (`enlaceWaze`, `enlaceGoogleMaps`,
  `enlaceWhatsapp`), `horaDeSalida` (llegada − trayecto − 5 min), `proximasCitas` y
  `hayQueRecalcular`, `horasDeAtasco` y `fraseHorasPunta`. `ubicacionActual()`
  (`services/ubicacion.ts`) nunca pide permiso: solo lo usa si ya lo hay.
- **Radares**: solo fijos oficiales de la DGT (NAP, DATEX II), dentro de la app en
  `src/data/radares/radares-dgt.json` (cabinas y tramos de velocidad media; sin País
  Vasco ni Cataluña, que tienen su propio servicio). Se actualizan con `npm run radares`
  (`scripts/actualizar-radares.mjs`) + commit y push. El script **revisa** los datos con
  OpenStreetMap (Overpass): quita las cabinas repetidas (las del principio y el final de
  cada tramo vienen también como cabina), descarta las que no están a menos de 120 m de
  una carretera (26/09: 7, en la N-330 de Huesca, A-42, GR-30 y CV-10; quedan en
  `descartados` del JSON) y toma el **límite de velocidad** del radar de OpenStreetMap que
  esté a menos de 60 m (591 de 689). Los tramos vienen uno por sentido: en una ruta solo
  cuentan si pasa por su principio y después por su final (`radaresSobreRuta`). En el
  mapa: círculo negro con el límite dentro; los tramos, uno al principio y otro al final.
- **Más zonas** (pendiente, lo pidió el usuario el 26/09): añadir radares oficiales del
  resto de España hasta completarla, cada fuente en su archivo en `src/data/radares/`
  (se juntan en `index.ts`). Cataluña: Servei Català de Trànsit, "Radars fixos de
  Catalunya" (analisi.transparenciacatalunya.cat, id `re3y-fftf`; no es una tabla, hay que
  bajar su archivo). País Vasco: Trafikoa ("Cabinas de radar fijo" y la API de tráfico de
  opendata.euskadi.eus). Después, los municipales que publiquen los ayuntamientos.
- **Hora de salida** (`services/rutas/actualizar.ts`, `iniciarTrafico()` en `_layout`):
  para las citas con lugar y coordenadas de las próximas 24 h (máx. 5; no bloques de foco
  ni tareas), con el tráfico previsto para llegar a su hora (`arriveAt`) desde donde
  estás (o desde casa si no hay permiso). Se guarda en `organizy:salidas`
  (`data/salidas.ts`: `useSalida(eventoId, dia)`, `leerSalidas`). Se recalcula al abrir la
  app, al volver a ella, al cambiar eventos o perfil y cada 10 min con la app abierta;
  cada cita pregunta al servidor solo si su cálculo tiene más de 15 min (a menos de 3 h
  de salir) o de 2 h (si falta más), si te has movido más de 1 km o si cambió la hora.
- **En segundo plano no se recalcula**: en iPhone las tareas en segundo plano
  (BGAppRefresh) las lanza iOS cuando quiere (pueden pasar horas) y en Expo Go no se
  pueden registrar; en Android WorkManager tampoco garantiza la hora. Lo fiable: el aviso
  se programa con el tráfico previsto para esa hora y se corrige cada vez que se abre la
  app. Con la app propia se podría añadir `expo-background-task` como extra.
- **Hoy**: en la tarjeta "Lo siguiente", `SalidaSiguiente` ("Sal a las 10:05 · 18 min en
  coche" y botón "Cómo llegar" → `/mapa?evento=<id>&dia=<AAAA-MM-DD>`). Si ya pasó:
  "Vas justo: tenías que salir a las...".
- **Aviso "Sal ya"** (tipo `salida`, interruptor `salida` en Perfil > Avisos, botón de
  prueba): a la hora de salir, "Sal ya: Reunión" / "18 min en coche hasta Oficina para
  llegar a las 10:30.". Al tocarlo abre el Mapa con la ruta (destino `mapa`). Botón
  "Avisar de retraso": abre la app y esta abre WhatsApp (`wa.me/?text=`) con "Voy con unos
  10 min de retraso, lo siento"; nunca se envía solo.
- **Pestaña Mapa** (`screens/PantallaMapa.tsx` y `screens/mapa/`): buscador "¿A dónde
  vas?" que propone Casa, los sitios habituales y los próximos eventos con lugar (7 días)
  y acepta cualquier dirección (`buscarCoordenadas`); mapa con tu posición, la ruta
  elegida y sus tramos, las alternativas (se pueden tocar) y los radares de la ruta (sin
  ruta, los de 25 km alrededor); tarjetas de ruta (duración, "+6 min", km y radares);
  "Sal a las..." si el destino es un evento; botones "Abrir en Waze" y "Abrir en Google
  Maps"; leyenda Atasco, Denso y Radar; frase de horas punta.
- **Horas punta**: una vez por semana (o al cambiar casa, trabajo o transporte), de casa
  al trabajo y vuelta saliendo de 7:00 a 20:30 cada media hora en el próximo laborable.
  Atasco = 25 % más que la hora más despejada y pico local; como mucho 3 horas, separadas
  2 h. Se guarda en `organizy:horasPunta` (`data/horasPunta.ts`). Hace falta un sitio
  llamado "Trabajo" con coordenadas.
- **Gasto** (un usuario, día normal): ~15-30 peticiones a TomTom (3 citas recalculadas
  varias veces, unas 5 búsquedas en el Mapa y 8 de media de horas punta); en el peor caso
  unas 60. Con 2.500 gratis al día llega para unas 80-150 personas al día, a 0 €. En la
  web, cada vista del mapa gasta unos 30-60 trozos de mapa de los 50.000 diarios.
  Supabase gratis: 500.000 llamadas a funciones al mes. Navegar no gasta más al empezar
  (las indicaciones vienen con las rutas del Mapa); cada recálculo por salirte, 1 petición.
- **Mapa en grande** (`screens/mapa/MapaGrande.tsx`, un `Modal` a pantalla completa):
  botón "En grande" encima del mapa; abajo, la ruta y "Empezar".
- **Navegación por voz** (26/09, a petición del usuario): botón "Empezar" en el Mapa y en
  el mapa grande. El Mapa pide las rutas con `instrucciones: true` (TomTom
  `instructionsType=text`; el servidor manda maniobra, calle y número de salida y la app
  monta el texto en tuteo: `textoInstruccion`). `services/rutas/navegacion.ts` (puro, con
  pruebas): `calcularGuia` (por dónde vas, siguiente maniobra, lo que queda, próximo
  radar, fuera de ruta a más de 50 m) y `queDecir` (avisos a 1 km, 300 m y encima; a pie
  100 y 20 m; radar a 500 m con su límite; "Has llegado"). `motorNavegacion.ts`: escucha
  el GPS (`watchPositionAsync`), habla (`services/voz.ts`: expo-speech en es-ES, suena
  aunque el iPhone esté en silencio gracias a expo-audio `playsInSilentMode`, bajando la
  música) y recalcula tras 3 posiciones fuera de la ruta. Mientras navegas la pantalla no
  se apaga (expo-keep-awake). La primera frase sale del propio toque (la web y el iPhone
  no dejan hablar sin un toque).
- **Con el móvil bloqueado**: en la web y en Expo Go **no se puede** (el sistema congela la
  app y Expo Go no permite ubicación en segundo plano); se avisa en pantalla y se
  mantiene la pantalla encendida. **Preparado para la app propia**: `navegacionFondo.ts`
  (tarea de expo-task-manager con `startLocationUpdatesAsync`, `AutomotiveNavigation`,
  aviso azul en iOS y servicio en primer plano en Android) y en `app.json`
  `isIosBackgroundLocationEnabled`, `isAndroidForegroundServiceEnabled` y audio en segundo
  plano (expo-audio `enableBackgroundPlayback`; sin permiso de micrófono). Solo se activa
  fuera de Expo Go; si no hay permiso, sigue en primer plano.
- **Para la fase 7 (alarma de salida)**: usar las mismas salidas (`leerSalidas`,
  `suscribirseSalidas`) y no duplicar con el "Sal ya" (por ejemplo, apagar el aviso de esa
  cita si ya tiene alarma). Hecho así en la fase 7.

## Fase 7: alarmas (decisiones)

- **Tres niveles detrás de una misma pestaña** (`services/alarmas/nivel.ts`,
  `useNivelAlarmas()`); la pestaña guarda igual en todos (`data/alarmas.ts`,
  `organizy:alarmas`) y una línea arriba (`AvisoNivel`) dice cómo van a sonar:
  - **"nativo"** (app propia, build de EAS): alarmas de verdad con
    **`react-native-alarm-scheduler`** (AlarmKit en iPhone con iOS 26+; en Android,
    `AlarmManager.setAlarmClock` + servicio en primer plano + pantalla completa). Suenan
    bloqueado y en silencio. Solo si hay módulo **y** permiso; si no, pasan a "avisos".
    El permiso se pide al guardar la primera alarma (`permisoAlarmas(true)`); si se
    deniega, la pestaña ofrece "Dar permiso" (abre los ajustes).
  - **"avisos"** (Expo Go, iPhone con iOS < 26 o sin permiso): despertador, inteligente
    y salidas son avisos con sonido de la fase 4 (tipos `alarma` y `alarma-salida`, con
    botones "Posponer 5 min", "Parar" y, en las de salida, "Cómo llegar"). **Con el
    móvil en silencio no suenan** y el sonido es corto: la pestaña lo dice.
  - **"web"**: nada suena. En la web de un iPhone, cada alarma ofrece "Crear en el Reloj
    del iPhone" con el Atajo "Organizy alarma" (`services/alarmas/atajo.ts`: enlace
    oficial `shortcuts://run-shortcut?name=...&input=text&text=07:30|Nombre`; los pasos
    para crearlo están plegados en la pestaña y en la guía). Los días de repetición no se
    pueden pasar al Atajo. **El Atajo no está probado** desde aquí.
- **La librería no se importa directamente**: `requireOptionalNativeModule('AlarmScheduler')`
  (de `expo`) devuelve null en Expo Go, así el túnel sigue funcionando. Su plugin está en
  `app.json` con la frase del permiso de AlarmKit.
- **Tipos** (`Alarma`): despertador e inteligente (hora, días —vacío = una vez, con
  `unaVezEl`; se apaga sola al pasar—, nombre, sonido "alarma" o "vibrar", encendida,
  y en la inteligente `adelantoMaxMin` 10/20/30/45). **Hora de dormir**: aviso suave (no
  alarma, en todos los niveles menos la web) 15/30/45/60 min antes de acostarse
  (`minutoDormir`); los días de Época dorada no sale (la época tiene el suyo).
  **Salida**: interruptor por evento en la sección "Alarmas de salida · se ajustan al
  tráfico" (`ajustes.salidas`, ids de evento; vale para toda la serie). Suena a la hora
  de salir de la fase 6 (`leerSalidas`), así que se mueve sola si cambia el evento o el
  tráfico; con alarma, el "Sal ya" de esa cita no se programa. Los ids de eventos
  borrados o sin lugar se limpian solos.
- **Alarma inteligente, fiable**: siempre programada a su hora normal; solo se adelanta
  si hay dato de tráfico, como mucho `adelantoMaxMin` (`adelantoMinutos`: retraso
  redondeado a 5 min; menos de 5 min no mueve nada). Destino: la primera cita con lugar
  después de la alarma o, en días de trabajo, el sitio "Trabajo" a la hora
  `empiezoTrabajo` (`destinoInteligente`). Tráfico **previsto** (TomTom `arriveAt`) desde
  casa, así que vale calcularlo la noche antes: `actualizarAdelantos()` (solo la próxima
  vez, si es en menos de 30 h; repregunta cada 2 h, o cada 15 min a menos de 3 h). Se
  guarda en `organizy:adelantos`. Se hace al abrir la app, al volver, al cambiar datos y
  cada 10 min con ella abierta (`iniciarAlarmas()` en `_layout`). **No se usa tarea en
  segundo plano ni push silencioso**: iOS los lanza cuando quiere (o nunca), Expo Go no
  los permite y el push obligaría a guardar horas y destinos en el servidor. Con la app
  propia se podría añadir `expo-background-task` como extra, sin quitar lo anterior.
- **Alarmas de verdad** (`definiciones.ts`, puro, con pruebas; `nativo.ts`): se calcula la
  lista que debe haber y se compara con lo programado (`organizy:alarmasNativas`): solo
  cambia lo distinto y **primero programa la nueva y después quita la vieja**. AlarmKit
  solo sabe "una vez, la próxima vez que llegue esa hora" o "cada semana": la inteligente
  va en una semanal por día y solo cambia la de su próxima vez (si no se abre la app en
  una semana, suena antes, nunca tarde); una de "una vez" a más de 24 h va como semanal
  de ese día y se quita cuando pasa. AlarmKit solo deja un botón además de "Parar":
  "Posponer 5 min" o "Cómo llegar"; los dos **abren la app** (hay que desbloquear), que
  pospone (otra alarma dentro de 5-6 min) o abre el Mapa (`atenderAlarmasNativas()` al
  abrir y al volver a la app). Posponer sin abrir la app necesitaría una extensión de
  Live Activity (pendiente). IDs en UUID (AlarmKit lo exige).
- **Pestaña** (`PantallaAlarmas`): título, `AvisoNivel`, tarjeta oscura de la
  inteligente (`TarjetaInteligente`, como en BRIEF.md: hora nueva en 56 px, la de siempre
  tachada, motivo "Hoy suena 15 min antes: hay atasco camino del trabajo"; sin barra de
  acento), lista (`FilaAlarma`: hora grande, días y nombre, interruptor; apagada sin fondo
  blanco), salidas y hora de dormir; "+" abre `/alarma`. Formulario corto: tipo con
  casillas de icono, hora de 5 en 5 min y días; en "Más ajustes", nombre, sonido y
  adelanto máximo. Tras "Posponer" se abre `/alarmas?pospuesta=HH:MM`.
- **Probar las alarmas de verdad** (lo hace el usuario; nunca le pidas contraseñas):
  - **iPhone**: solo con la cuenta de desarrollador de Apple (99 €/año). Cuando la tenga:
    `bundleIdentifier` en `app.json`, `npx eas-cli@latest device:create` (registra su
    iPhone) y `npx eas-cli@latest build --profile preview --platform ios`; instala desde
    el enlace de EAS. Necesita iOS 26 o más. Prueba: alarma para dentro de 2 min, móvil
    bloqueado y en silencio.
  - **Android, sin cuenta de pago**: se puede ya con un APK de EAS (cuenta de Expo
    gratis): `android.package` en `app.json`, `"android": { "buildType": "apk" }` en el
    perfil `preview` de `eas.json` y `npx eas-cli@latest build --profile preview --platform
    android`; se instala desde el enlace. Hay que dar "Alarmas y recordatorios" y
    "Pantalla completa" en Ajustes. El mapa en Android necesitará la clave de Google Maps
    (ver "Fase 6"). El usuario no tiene Android (26/09/2026).

## Hoja de ruta

- [x] 1. Base: proyecto, pestañas y diseño.
- [x] 2. Formulario de bienvenida y perfil.
- [x] 3. Calendario: pantallas Hoy y Semana.
- [x] 4. Avisos (notificaciones).
- [x] 4b. Época dorada: modo para exámenes o épocas de trabajo intenso (prompt en C:\Users\usuario\OneDrive\PERSONAL\Organizy\Prompts\Organizy-04b-epoca-dorada.md)
- [x] 5. Captura rápida con IA. Supabase montado y funciones desplegadas (proyecto `hwemrpexabisyueyizjz`). Falta solo la clave de Anthropic: el usuario la pondrá cuando la app esté terminada (ver "Decisiones del usuario", 26/09/2026).
- [x] 6. Mapa, tráfico, radares y rutas (el código está hecho; falta que el usuario cree la cuenta de TomTom, ponga la clave en Supabase y se despliegue la función `rutas`: ver "Fase 6").
- [x] 7. Alarmas (en Expo Go son avisos con sonido; las alarmas de verdad están programadas pero sin probar hasta que haya build de EAS: ver "Fase 7").
- [ ] 8. Planes con WhatsApp y votación.
- [ ] 9. Voz sin abrir la app y widget.
- [ ] 10. Recordatorios a clientes por WhatsApp Business (opcional).
