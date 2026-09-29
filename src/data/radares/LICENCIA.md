# Licencia de los datos de radares

`radares-dgt.json` es una base de datos hecha con dos fuentes abiertas:

- **Radares fijos**: Dirección General de Tráfico (DGT), Punto de Acceso Nacional de
  Tráfico y Movilidad (https://nap.dgt.es/dataset/radares-fijos-dgt). Datos abiertos
  del sector público, reutilizables citando la fuente y la fecha de actualización
  (campos `fuente` y `publicado` del archivo).
- **Límites de velocidad y revisión de las posiciones**: © colaboradores de
  OpenStreetMap (https://www.openstreetmap.org/copyright), con licencia Open Database
  License (ODbL) 1.0.

Como mezcla datos de OpenStreetMap, **`radares-dgt.json` se pone a disposición con la
licencia ODbL 1.0**: https://opendatacommons.org/licenses/odbl/1-0/

Esta licencia solo cubre ese archivo de datos, no el resto de Organizy (ver `LICENSE`
en la raíz del repositorio).

Si el repositorio deja de ser público, hay que seguir ofreciendo este archivo (por
ejemplo, publicándolo aparte) a quien use la app, porque la ODbL lo exige.

Lo genera `npm run radares` (`scripts/actualizar-radares.mjs`).
