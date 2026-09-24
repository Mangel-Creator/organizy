# Brief de diseño — Organizy

Decidido con el usuario el 24/09/2026 (`/diseno`). Sirve para que cualquier sesión
retome el diseño sin repetir la entrevista. Los valores reales viven en
`src/theme/index.ts`; este archivo explica el porqué.

## Objetivo y público

App para organizar el día de alguien que mezcla vida personal, amigos y clientes.
Para cualquier persona, en español de España, móvil primero (web en GitHub Pages
y app en Expo Go). Tiene que leerse de un vistazo y transmitir calma, no agobio.

## Dirección visual: cuaderno cálido

Es la evolución de lo que ya había, no un cambio de piel:

- Papel crema de fondo, tarjetas blancas con borde fino y sin sombras.
- Títulos grandes en Fraunces recta (600/700), nunca en cursiva. El resto en DM Sans.
- Un solo nivel de caja: nada de tarjeta dentro de tarjeta.
- Esquinas de 14 a 18 px, solo modo claro, sin degradados.

## Paleta

Regla nueva: **cada color significa una sola cosa**. Antes el naranja era a la vez
"botón" y "Clientes"; ahora los botones son azul tinta y el naranja es solo Clientes.

| Token | Hex | OKLCH | Uso | Contraste |
|---|---|---|---|---|
| `fondo` | `#F4F1EA` | 0.96 0.010 87 | Fondo de pantalla | — |
| `tarjeta` | `#FFFFFF` | 1.00 0 0 | Tarjetas y filas | — |
| `texto` | `#1A1C24` | 0.23 0.016 274 | Texto principal, tipo "Yo" | 15 : 1 sobre fondo |
| `textoSecundario` | `#5E5A52` | 0.47 0.014 85 | Texto de apoyo | 6.1 : 1 sobre fondo |
| `borde` | `#DDD6C8` | 0.88 0.020 85 | Bordes de tarjetas y campos | decorativo |
| `principal` | `#2B4BD8` | 0.49 0.218 267 | Botón principal, "+", pestaña activa, interruptores, "hoy" | 6.8 : 1 con blanco |
| `clientes` | `#C4461E` | 0.56 0.169 37 | Solo eventos de Clientes | 5.0 : 1 con blanco |
| `amigos` | `#16734F` | 0.49 0.101 162 | Solo eventos de Amigos | 5.8 : 1 con blanco |
| `yo` | = `texto` | | Solo eventos personales | |
| `aviso` | `#A1172F` | 0.46 0.170 19 | **Nuevo.** Errores, "pisa tu bloque de foco", día cargado (>80 %) | 7.8 : 1 con blanco |
| `cargaNormal` | `#8A8374` | 0.61 0.024 86 | Barrita de carga normal y borde de huecos (antes `#A39C8E`, que no llegaba a 3 : 1) | 3.8 : 1 sobre blanco |

El granate de aviso es más oscuro y más rojo que el naranja de Clientes, y siempre
va acompañado de texto, así que no se confunden.

La tarjeta **"Siguiente"** de Hoy deja de ser naranja fijo: toma el color del tipo de
su evento (naranja si es de un cliente, verde si es con amigos, negro si es tuyo).
Así se sabe qué viene sin leer.

## Tipografía

| Uso | Letra | Tamaño / interlineado |
|---|---|---|
| Título nivel 1 | Fraunces 600 | 34 / 40, interletrado −0.5 |
| Título nivel 2 | Fraunces 600 | 26 / 32 |
| Título nivel 3 | Fraunces 600 | 18 / 24 |
| Texto | DM Sans 400 (500 y 700 para destacar) | 16 / 22 |
| Texto pequeño | DM Sans 400 | 13 / 18 |

## Densidad: la elige cada persona

Por decisión del usuario, **cada persona elige cómo se ve** en Perfil > "Cómo se ve".
Por defecto sale **Equilibrado**. Se guarda en el dispositivo (`organizy:densidad`).

| | Con aire | Equilibrado | Compacto |
|---|---|---|---|
| Eventos visibles en Hoy (aprox.) | 3-4 | 5-6 | 8 o más |
| Alto de fila de evento | 76 | 60 | 48 |
| Separación entre filas | 12 | 8 | 4 |
| Tamaño del texto de las filas | 17 | 16 | 15 |
| Semana: píxeles por hora | 72 | 56 | 44 |

Afecta a lo que más se mira: las listas de Hoy (eventos, huecos y tareas) y la línea
de horas de Semana. Los formularios (bienvenida, perfil, ficha de evento) no cambian.
Nada baja nunca de 44 px de alto para pulsar.

## Movimiento

Alguna animación suave, sin excesos (lo pidió el usuario). Solo donde explica algo:

- La casilla de una tarea da un pequeño salto al marcarla.
- Las filas de Hoy se recolocan deslizándose (por ejemplo, la tarea hecha baja a "Hecha").
- Semana hace un fundido corto (160 ms) al cambiar de día, para que se note el cambio.
- Los botones y filas se hunden un poco al pulsarlos.

Nada se anima al abrir una pantalla, no hay pulsos ni movimientos que se repitan, y todo
se desactiva si el móvil tiene "reducir movimiento".

## Cómo se construye

- Colores y medidas en `src/theme/index.ts` (con el token nuevo `aviso`).
- Densidad en `src/data/densidad.ts`: `useDensidad()` devuelve el nivel y sus medidas;
  `guardarDensidad(nivel)` la cambia y la app se actualiza sola.
- Imágenes: ninguna. Iconos: solo Ionicons.
- Filas apagadas (eventos pasados, tareas hechas) sin opacidad: sin fondo blanco y con
  texto secundario, para no bajar del contraste mínimo.
- Revisión en la web a 375 px: contraste medido, nada que se salga por los lados,
  zonas de toque de 44 px, y luego `npx tsc --noEmit`, `npx expo lint` y `npm test`.
