# Presentation Micro-Site

Esta carpeta contiene una micro-app pensada para tu pitch de hackathon. Es un soporte visual que ayuda a mostrar el problema, la solución y el valor del proyecto de forma rápida y profesional.

## Qué contiene

- `index.html` — página principal de la presentación con pestañas.
- `style.css` — estilos para el layout, los cards y la experiencia visual.
- `script.js` — controla la navegación entre pestañas y el demo interactivo de split.
- `package.json` — comando simple para servir el sitio con Node.
- `server.js` — servidor estático mínimo para ejecutar la presentación en `localhost:8000`.

## Cómo funciona la presentación

La presentación tiene estas secciones:

1. **Resumen**: explica qué hace el proyecto, su propuesta de valor y por qué es relevante para festivales.
2. **Flujo**: muestra el proceso paso a paso y los roles de productora, artista y estado.
3. **Demo**: calcula en tiempo real el split de un pago de show en AVAX.
4. **Pitch**: estructura el mensaje para el jurado con problema, solución e impacto.
5. **Entrega**: deja claro que esta micro-app es independiente y que no toca la app principal.

## Cómo usarlo paso a paso

### Opción 1: Abrir directamente el HTML

1. Abrí el explorador de archivos de tu sistema.
2. Navegá hasta la carpeta `presentation`.
3. Hacé doble clic en `index.html`.
4. El sitio se abrirá en tu navegador como una página estática.

> Esta opción funciona bien para revisar la presentación, pero algunos navegadores pueden bloquear scripts o recursos si se abre directamente como archivo local. Por eso también hay una opción de servidor.

### Opción 2: Servirlo con Node en localhost

1. Abrí la terminal en la carpeta raíz del proyecto: `c:\hackaton\Avalanche202605\scontract-artistas-salta`.
2. Entrá en la carpeta `presentation`:

   ```bash
   cd presentation
   ```

3. Ejecutá el servidor:

   ```bash
   npm start
   ```

4. Abrí en el navegador la URL:

   ```text
   http://localhost:8000
   ```

### Qué verás en el navegador

- Una barra lateral con botones para navegar entre secciones.
- Un panel principal con contenido limpio y enfocado.
- En la sección `Demo`, un campo para ingresar un monto en AVAX y ver automáticamente el split:
  - Artista 97%
  - Estado 2%
  - Productora 1%

## Verificación y garantías

- Esta carpeta está afuera de `frontend/` y no modifica nada del código principal.
- Si querés, podés usarla como material extra para el jurado o como pantalla de apoyo en tu presentación.
- El objetivo es que tengas una demostración visual clara, sin tener que desplegar la app real.

## Solución de problemas

- Si `npm start` no funciona, asegurate de tener Node instalado.
- Si el navegador no carga `http://localhost:8000`, cerrá la terminal y volvé a correr `npm start`.
- Si abrís `index.html` directamente y no se ve bien, usá la opción de servidor.

## Nota importante

Esta micro-app es para documentación y presentación. El frontend real del proyecto sigue en su propia carpeta `frontend/` y no se debe tocar para esta demo.
