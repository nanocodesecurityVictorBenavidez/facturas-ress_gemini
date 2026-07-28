# Facturas RESS con Claude

Versión adaptada de la aplicación original para leer fotografías de facturas
de Creta Ceibos, Creta Carlos Julio y Creta Daule, usando la API de Claude
(Anthropic) para la extracción de datos.

## Funciones agregadas

- Cámara trasera en Android y selección desde galería.
- Extracción estructurada con Claude (Sonnet 5).
- Revisión y corrección antes de guardar.
- Productos vinculados a cada factura.
- Inventario por sucursal o consolidado.
- Exportación del inventario a Excel.
- Detección de facturas repetidas por número.
- La clave de Claude permanece en el servidor (nunca en el APK ni en el navegador).

## Publicar en Vercel

1. Suba esta carpeta a su repositorio de GitHub.
2. Importe el repositorio desde Vercel.
3. En **Settings → Environment Variables**, cree:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: su clave de platform.claude.com (Consola de Anthropic).
     Nota: esta clave es independiente de una suscripción Pro/Max de
     claude.ai — se genera y se factura por separado en
     https://platform.claude.com
4. Opcionalmente cree `ANTHROPIC_MODEL`. Si no se define, se usa
   `claude-sonnet-5`.
5. Vuelva a desplegar el proyecto.

No escriba la clave dentro de `index.html`, GitHub ni el APK.

## Uso en Android

Abra la dirección publicada con Chrome, pulse el menú de tres puntos y elija
**Añadir a pantalla principal**. La interfaz se adapta al móvil y el botón
**Escanear** abre la cámara trasera.

## Flujo recomendado

1. Seleccionar la sucursal correcta.
2. Pulsar **Escanear**.
3. Fotografiar la factura completa.
4. Revisar los datos y productos.
5. Guardar la factura.
6. Consultar **Inventario** para ver productos por sucursal o consolidados.

## Notas técnicas del cambio Gemini → Claude

- El endpoint `/api/analyze-invoice.js` ahora llama a
  `https://api.anthropic.com/v1/messages` en lugar de la API de Gemini.
- Se usa la función de "tool use" forzado (`tool_choice`) para obligar a
  Claude a devolver el JSON estructurado con el mismo esquema de campos
  que antes (razon_social, ruc_empresa, sucursal, numero_factura,
  productos, etc.), por lo que **no fue necesario modificar el frontend**
  (`index.html`) ni la app Android — siguen recibiendo la misma forma de
  respuesta `{ invoice: {...} }`.
- Algunos nombres internos de funciones en `index.html` (como
  `requestGeminiInvoice`) conservan el nombre "Gemini" por compatibilidad;
  son solo identificadores internos y no afectan el funcionamiento ni son
  visibles para el usuario.
- Costo aproximado por factura con Sonnet 5: ~$0.006 USD (imagen +
  respuesta JSON). Con el volumen mensual que manejes, puedes activar
  Batch API (50% de descuento) si no necesitas respuesta inmediata.
