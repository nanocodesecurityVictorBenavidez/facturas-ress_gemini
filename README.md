# Facturas RESS con Gemini

Versión adaptada de la aplicación original para leer fotografías de facturas
de Creta Ceibos, Creta Carlos Julio y Creta Daule.

## Funciones agregadas

- Cámara trasera en Android y selección desde galería.
- Extracción estructurada con Gemini.
- Revisión y corrección antes de guardar.
- Productos vinculados a cada factura.
- Inventario por sucursal o consolidado.
- Exportación del inventario a Excel.
- Detección de facturas repetidas por número.
- La clave de Gemini permanece en el servidor.

## Publicar en Vercel

1. Suba esta carpeta a su repositorio de GitHub.
2. Importe el repositorio desde Vercel.
3. En **Settings → Environment Variables**, cree:
   - Nombre: `GEMINI_API_KEY`
   - Valor: su clave de Google AI Studio.
4. Opcionalmente cree `GEMINI_MODEL`. Si no se define, se usa
   `gemini-2.5-flash`.
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
