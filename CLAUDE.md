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
  - **App** para el dueño, en su iPhone con Expo Go (cuenta de Expo `mangel_creator`,
    proyecto vinculado con `eas init`). En el futuro, app en las tiendas.
- **Lo que no puede hacer la web** (quedará solo para la app): alarma que suena como
  despertador con el móvil bloqueado, widget y voz sin abrir la app (en web, como
  mucho, un Atajo del iPhone). En web lo que no funcione se oculta o se avisa.
- Avisos en web (fase 4): solo con la web añadida a la pantalla de inicio y con un
  servidor pequeño de notificaciones push.
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
                       TarjetaHueco, textos y opciones, useAhora).
  components/          Piezas reutilizables. Se importan desde '@/components'.
  theme/               Colores, letras, tamaños, espacios y radios.
  data/                Guardado local: ajustes.ts (AsyncStorage), db.ts (SQLite),
                       perfil.ts (perfil del usuario), energia.ts (energía del día),
                       eventos/ (eventos del calendario).
  services/            Lógica sin pantalla: fechas.ts (formatos en español),
                       lugares.ts (texto -> coordenadas), permisos.ts,
                       agenda/ (huecos, carga, resumen, reparto; con pruebas).
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
| Barrita de carga normal y borde de huecos | `#A39C8E` (gris, `cargaNormal`) |

Para el color de un tipo de evento usa `colorTipo[evento.tipo]` (en `theme`).

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
- `AvisoPantallaInicio` — solo en la web del móvil: cómo añadirla a la pantalla de inicio.
- `BotonInicial` — botón redondo con la inicial del nombre (abre Perfil).
- `Pantalla` — contenedor de pantalla con fondo, márgenes y scroll. Se aparta del
  teclado (`KeyboardAvoidingView`) y admite `ref` para hacer scroll.
- `Proximamente` — relleno provisional para pestañas sin hacer.
- `BotonFlotante` — botón redondo naranja con "+", fijo abajo a la derecha. Va al
  lado de `Pantalla` (no dentro), en un `View` con `flex: 1`.
- `Casilla` — casilla para marcar como hecho (44 px).
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
  `PRAGMA user_version`). Migración 1: tabla `eventos`. Solo se usa en Android e iOS.
- `src/data/perfil.ts`: tipo `Perfil` (nombre, vivienda con coordenadas, sitios
  habituales, transporte, uso, horario, días de trabajo, cuándo rinde más y
  antelación de avisos). Se guarda en AsyncStorage (`organizy:perfil` y
  `organizy:bienvenidaCompletada`).
  - En pantallas: `const { perfil } = usePerfil()` (se actualiza solo al guardar).
  - Fuera de pantallas: `await leerPerfil()`.
  - `guardarPerfil`, `completarBienvenida`, `repetirBienvenida`.
- `src/data/eventos/`: tipo `Evento` en `tipos.ts` (título, fecha "AAAA-MM-DD",
  horas "HH:MM" o null, tipo `cliente|amigos|yo`, lugar, notas, repetición,
  flexible + duración + hecha, foco, ejemplo).
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
  `siguienteEvento`, `bloqueDeFocoQuePisa`, `colocarEnCarriles`, `ventanaDelDia`.
  Tiempos en minutos desde medianoche (`Intervalo`).

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
- Lugar: "Sin lugar", un sitio habitual del perfil o "Otra dirección" (se buscan sus
  coordenadas con `buscarCoordenadas`; sin conexión se guarda solo el texto). Si la
  dirección no cambia al editar, se conservan sus coordenadas.
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

## Hoja de ruta

- [x] 1. Base: proyecto, pestañas y diseño.
- [x] 2. Formulario de bienvenida y perfil.
- [x] 3. Calendario: pantallas Hoy y Semana.
- [ ] 4. Avisos (notificaciones).
- [ ] 5. Captura rápida con IA.
- [ ] 6. Mapa, tráfico, radares y rutas.
- [ ] 7. Alarmas.
- [ ] 8. Planes con WhatsApp y votación.
- [ ] 9. Voz sin abrir la app y widget.
- [ ] 10. Recordatorios a clientes por WhatsApp Business (opcional).
