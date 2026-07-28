const MAX_IMAGE_CHARS = 12_000_000;

// Mismo esquema que antes (formato JSON Schema estándar, que es lo que espera Claude).
const invoiceInputSchema = {
  type: "object",
  properties: {
    razon_social: { type: "string" },
    ruc_empresa: { type: "string" },
    establecimiento: { type: "string" },
    sucursal: { type: "string", enum: ["Creta Ceibos", "Creta Carlos Julio", "Creta Daule", "Desconocida"] },
    direccion_matriz: { type: "string" },
    direccion_sucursal: { type: "string" },
    telefono: { type: "string" },
    numero_factura: { type: "string" },
    clave_acceso: { type: "string" },
    fecha_emision: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
    hora_emision: { type: "string", description: "Hora HH:mm" },
    centro: { type: "string" },
    cliente: { type: "string" },
    identificacion_cliente: { type: "string" },
    usuario: { type: "string" },
    tipo_cliente: { type: "string" },
    subtotal: { type: "number" },
    iva: { type: "number" },
    valor_pagar: { type: "number" },
    forma_pago: { type: "string" },
    confianza: { type: "number", description: "Valor de 0 a 1 según legibilidad general" },
    campos_inciertos: { type: "array", items: { type: "string" } },
    productos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          codigo: { type: "string" },
          cantidad: { type: "number" },
          descripcion: { type: "string" },
          precio_unitario: { type: "number" },
          descuento: { type: "number" },
          total: { type: "number" }
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en Vercel." });

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

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const prompt = [
    "Analiza esta fotografía de una factura térmica de RESS CÍA. LTDA.",
    "Las únicas sucursales válidas son Creta Ceibos, Creta Carlos Julio y Creta Daule.",
    "Transcribe todos los datos visibles sin inventar. Si un texto no es legible, usa cadena vacía y añádelo a campos_inciertos.",
    "Conserva el número completo de factura y la clave de acceso solo con los caracteres realmente visibles.",
    "Extrae cada producto por separado. Los valores monetarios deben ser números, no texto.",
    "Determina la forma de pago desde la línea ubicada después de VALOR A PAGAR.",
    "Comprueba que la suma de productos, subtotal, IVA y valor a pagar sea coherente.",
    "Llama a la herramienta extract_invoice con los datos extraídos."
  ].join("\n");

  try {
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.1,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 }
            }
          ]
        }],
        tools: [{
          name: "extract_invoice",
          description: "Guarda los datos estructurados extraídos de la factura.",
          input_schema: invoiceInputSchema
        }],
        tool_choice: { type: "tool", name: "extract_invoice" }
      })
    });

    const result = await claudeResponse.json();
    if (!claudeResponse.ok) {
      const message = result?.error?.message || "Claude rechazó la solicitud.";
      return res.status(claudeResponse.status).json({ error: message });
    }

    const toolUse = (result?.content || []).find(block => block.type === "tool_use");
    if (!toolUse || !toolUse.input) {
      return res.status(502).json({ error: "Claude no devolvió datos de la factura." });
    }

    return res.status(200).json({ invoice: toolUse.input });
  } catch (error) {
    console.error("Claude invoice error:", error);
    return res.status(500).json({ error: "No se pudo conectar con Claude." });
  }
};
