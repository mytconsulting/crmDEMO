# Prompt para Claude Code: Conexión Landing Page → CRM (MYT)

> **Uso**: Copia este prompt y pégalo en la sesión de Claude Code donde estés construyendo
> la landing page. Rellena las variables marcadas con `{{...}}` antes de pegarlo.

---

## Variables a rellenar antes de usar

```
TENANT_ID        = {{uuid-del-tenant}}
N8N_WEBHOOK_URL  = {{url-del-webhook, por defecto: https://n8n-n8n.eh3kh7.easypanel.host/webhook/entrada-manual-lead}}
CAMPOS_EXTRA     = {{lista de campos extra si los hay, o "ninguno"}}
```

---

## PROMPT (copiar desde aquí)

```
## BACKEND: Conexión del formulario con el CRM vía N8N Webhook

Esta landing page recoge leads a través de un formulario y los envía a nuestro CRM
mediante un webhook de N8N. Sigue estas especificaciones EXACTAS para el backend.

### 1. ENDPOINT

- URL: {{N8N_WEBHOOK_URL}}
- Método: POST
- Content-Type: application/json

### 2. CAMPOS FIJOS DEL FORMULARIO (siempre presentes)

| Campo    | Input type | Obligatorio | Notas                              |
|----------|-----------|-------------|------------------------------------|
| nombre   | text      | Sí          | Nombre completo del lead           |
| telefono | tel       | Sí          | Se normaliza a formato 34XXXXXXXXX |
| email    | email     | No          | Email de contacto                  |

### 3. CAMPOS EXTRA DEL FORMULARIO (específicos de este cliente)

{{SI HAY CAMPOS EXTRA, rellenar con la estructura de abajo. Si no, borrar esta sección}}

Los campos extra están configurados en el CRM para este tenant. Cada campo tiene:
- key: identificador interno (snake_case)
- label: texto visible en el formulario
- type: tipo de input (text | email | phone | number | textarea | select)
- required: si es obligatorio (true/false)
- options: solo para type "select", opciones separadas por coma

Campos extra de este cliente:

| key           | label              | type     | required | options                    |
|---------------|--------------------|----------|----------|----------------------------|
| {{key}}       | {{label}}          | {{type}} | {{bool}} | {{opciones si es select}}  |

### 4. PAYLOAD JSON QUE DEBE ENVIAR EL FORMULARIO

```json
{
  "tenant_id": "{{TENANT_ID}}",
  "nombre": "valor del input nombre",
  "telefono": "34XXXXXXXXX",
  "email": "valor del input email o null",
  "canal": "landing_page",
  "landing_page": "{{URL_DE_ESTA_LANDING}}",
  "notas": "",
  "campos_extra": {
    "{{key_campo_1}}": "valor",
    "{{key_campo_2}}": "valor"
  }
}
```

IMPORTANTE:
- Si no hay campos extra, enviar `campos_extra` como `{}` o no incluirlo.
- `tenant_id` es OBLIGATORIO. Sin él, el CRM no puede asociar el lead.
- `canal` debe ser siempre "landing_page" para leads que vengan de landings.
- `lead_id` no se envía; el CRM lo genera.

### 5. NORMALIZACIÓN DEL TELÉFONO (aplicar antes de enviar)

```javascript
function normalizarTelefono(raw) {
  const soloNumeros = raw.replace(/\D/g, "");
  if (soloNumeros.length === 9 && !soloNumeros.startsWith("34")) {
    return "34" + soloNumeros;
  }
  return soloNumeros;
}
```

### 6. FUNCIÓN DE ENVÍO (ejemplo de referencia)

```javascript
async function enviarLeadAlCRM(formData) {
  const telefono = normalizarTelefono(formData.telefono);

  const payload = {
    tenant_id: import.meta.env.VITE_TENANT_ID || "{{TENANT_ID}}",
    nombre: formData.nombre.trim(),
    telefono: telefono,
    email: formData.email?.trim() || null,
    canal: "landing_page",
    landing_page: window.location.origin,
    notas: "",
    campos_extra: {}  // rellenar con los campos extra si los hay
  };

  // Añadir campos extra dinámicamente
  // Ejemplo: payload.campos_extra.presupuesto = formData.presupuesto;

  try {
    const response = await fetch(
      import.meta.env.VITE_N8N_WEBHOOK_URL || "{{N8N_WEBHOOK_URL}}",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) throw new Error("Error al enviar");
    return { success: true };
  } catch (error) {
    console.error("Error enviando lead:", error);
    return { success: false, error };
  }
}
```

### 7. VARIABLES DE ENTORNO (.env)

```env
VITE_N8N_WEBHOOK_URL={{N8N_WEBHOOK_URL}}
VITE_TENANT_ID={{TENANT_ID}}
```

### 8. FLUJO POST-ENVÍO (qué pasa después)

1. N8N recibe el lead por webhook
2. El agente IA del CRM envía un mensaje de WhatsApp al lead automáticamente
3. El lead aparece en el Kanban del CRM con estado "nuevo" y lead_score 0
4. El chatbot IA gestiona la conversación y va actualizando el lead_score (0-100)
5. Las interacciones se registran en la tabla `interacciones` de Supabase

### 9. UX POST-FORMULARIO

Tras enviar el formulario con éxito:
- Mostrar mensaje de confirmación al usuario (ej: "Hemos recibido tu solicitud, te contactaremos pronto por WhatsApp")
- Deshabilitar el botón de envío para evitar duplicados
- Opcionalmente redirigir a una página de gracias

### 10. VALIDACIONES MÍNIMAS EN FRONTEND

- nombre: no vacío, mínimo 2 caracteres
- telefono: 9 dígitos (España) o formato internacional con prefijo
- email: formato válido si se rellena (no obligatorio salvo que se indique)
- Campos extra marcados como required: validar que no estén vacíos
- Campos extra tipo "select": validar que el valor esté entre las opciones permitidas
- Campos extra tipo "number": validar que sea numérico
```

---

## Notas internas (no copiar al prompt)

### Estructura de custom_fields en tenant_config

Cada campo extra se guarda como un objeto en un array JSON:

```json
[
  {
    "key": "presupuesto",
    "label": "Presupuesto aproximado",
    "type": "select",
    "required": true,
    "options": "Menos de 5.000€, 5.000-15.000€, Más de 15.000€"
  },
  {
    "key": "sector",
    "label": "Sector de la empresa",
    "type": "text",
    "required": false,
    "options": ""
  }
]
```

### Tipos de campo disponibles

| type     | Input HTML equivalente      |
|----------|-----------------------------|
| text     | `<input type="text">`       |
| email    | `<input type="email">`      |
| phone    | `<input type="tel">`        |
| number   | `<input type="number">`     |
| textarea | `<textarea>`                |
| select   | `<select>` con `<option>`s  |

### Cómo obtener los campos extra de un tenant

Si quieres que la landing consulte dinámicamente los campos extra (en vez de hardcodearlos):

```javascript
const { data } = await supabase
  .from("tenant_config")
  .select("custom_fields")
  .eq("tenant_id", TENANT_ID)
  .single();

// data.custom_fields = array de objetos con {key, label, type, required, options}
```

### Valores válidos de "canal" en el CRM

cold_call | linkedin | referido | evento | telefono | otro

Para landings usamos siempre: `"landing_page"`
(Si el CRM no lo reconoce, cae como "otro" sin problemas)
