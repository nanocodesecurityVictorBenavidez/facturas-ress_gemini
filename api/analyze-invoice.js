const MAX_IMAGE_CHARS = 12_000_000;

// Mismo esquema de siempre, pero en el formato que espera Gemini (tipos en
// mayúsculas: OBJECT, STRING, NUMBER, ARRAY — es un subconjunto de JSON
// Schema/OpenAPI, no exactamente igual al que usa Claude).
const invoiceInputSchema = {
  type: "OBJECT",
  properties: {
    razon_social: { type: "STRING" },
    ruc_empresa: { type: "STRING" },
    establecimiento: { type: "STRING" },
    sucursal: { type: "STRING", enum: ["Creta Ceibos", "Creta Carlos Julio", "Creta Daule", "Desconocida"] },
    direccion_matriz: { type: "STRING" },
    direccion_sucursal: { type: "STRING" },
    telefono: { type: "STRING" },
    numero_factura: { type: "STRING" },
    clave_acceso: { type: "STRING" },
    fecha_emision: { type: "STRING", description: "Fecha ISO YYYY-MM-DD" },
    hora_emision: { type: "STRING", description: "Hora HH:mm" },
    centro: { type: "STRING" },
    cliente: { type: "STRING" },
    identificacion_cliente: { type: "STRING" },
    usuario: { type: "STRING" },
    tipo_cliente: { type: "STRING" },
    subtotal: { type: "NUMBER" },
    iva: { type: "NUMBER" },
    valor_pagar: { type: "NUMBER" },
    forma_pago: { type: "STRING" },
    confianza: { type: "NUMBER", description: "Valor de 0 a 1 según legibilidad general" },
    campos_inciertos: { type: "ARRAY", items: { type: "STRING" } },
    productos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          codigo: { type: "STRING" },
          cantidad: { type: "NUMBER" },
          descripcion: { type: "STRING" },
          precio_unitario: { type: "NUMBER" },
          descuento: { type: "NUMBER" },
          total: { type: "NUMBER" }
        },
        required: ["codigo", "cantidad", "descripcion", "precio_unitario", "descuento", "total"]
      }
    }
  },
  required: [
    "razon_social", "ruc_empresa", "establecimiento", "sucursal",
    "numero_factura", "clave_acceso", "fecha_emision", "hora_emision",
    "centro", "cliente", "identificacion_cliente", "subtotal", "iva",
    "valor_pagar", "forma_pago", "confianza", "campos_inciertos", "productos"
  ]
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY en Vercel." });

  const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "No se recibió la imagen." });
  }
  if (imageBase64.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: "La imagen es demasiado grande." });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return res.status(400).json({ error: "Formato de imagen no permitido." });
  }

  // Se puede forzar otro modelo con la variable GEMINI_MODEL en Vercel
  // (por ejemplo "gemini-2.5-flash" si algún día hace falta más calidad),
  // pero por defecto usa Flash-Lite: es el que más cuota gratis tiene.
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  const prompt = [
    "Analiza esta fotografía de una factura térmica de RESS CÍA. LTDA.",
    "Las únicas sucursales válidas son Creta Ceibos, Creta Carlos Julio y Creta Daule.",
    "Transcribe todos los datos visibles sin inventar. Si un texto no es legible, usa cadena vacía y añádelo a campos_inciertos.",
    "Conserva el número completo de factura y la clave de acceso solo con los caracteres realmente visibles.",
    "Extrae cada producto por separado. Los valores monetarios deben ser números, no texto.",
    "Determina la forma de pago desde la línea ubicada después de VALOR A PAGAR.",
    "Comprueba que la suma de productos, subtotal, IVA y valor a pagar sea coherente.",
    "Devuelve SOLO el JSON con los datos extraídos, sin texto adicional."
  ].join("\n");

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: invoiceInputSchema,
          temperature: 0.1
        }
      })
    });

    const result = await geminiResponse.json();
    if (!geminiResponse.ok) {
      const message = result?.error?.message || "Gemini rechazó la solicitud.";
      return res.status(geminiResponse.status).json({ error: message });
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "Gemini no devolvió datos de la factura." });
    }

    let invoice;
    try {
      invoice = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Gemini devolvió una respuesta que no se pudo interpretar como JSON." });
    }

    return res.status(200).json({ invoice });
  } catch (error) {
    console.error("Gemini invoice error:", error);
    return res.status(500).json({ error: "No se pudo conectar con Gemini." });
  }
};
