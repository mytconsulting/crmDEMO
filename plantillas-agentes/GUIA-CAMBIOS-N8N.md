# Guia de cambios en n8n - WF2 (Chatbot WhatsApp)

## Resumen del cambio

Actualmente el system prompt del Agente IA tiene el contexto de M&T Consulting
hardcodeado. Vamos a hacer que lea el contexto desde la tabla `documentos_chatbot`
de Supabase, haciendolo dinamico por tenant.

## Paso 1: Anadir nodo "Cargar Contexto Chatbot" (Supabase)

**Tipo**: Supabase
**Nombre**: `Cargar Contexto Chatbot`
**Posicion**: Entre "Recopilar Mensajes" y "Preparar Prompt"
**Configuracion**:
- Operation: Get Many
- Table: `documentos_chatbot`
- Return All: true
- Filters:
  - tenant_id equals `{{ $('Buscar Lead').first().json.tenant_id }}`
  - activo equals `true`

**Conexion**: La salida de "Recopilar Mensajes" va a "Cargar Contexto Chatbot",
y la salida de este va a "Preparar Prompt".

## Paso 2: Modificar nodo "Preparar Prompt" (Code)

Reemplazar el codigo actual por este:

```javascript
const mensajes = $('Recopilar Mensajes').all();
const lead = $('Buscar Lead').first().json;
const datos = $('Mensaje Final').first().json;

// Cargar documentos de contexto del chatbot
const docsRaw = $('Cargar Contexto Chatbot').all();
const docs = {};
for (const d of docsRaw) {
  const j = d.json;
  if (j.contenido && j.contenido.trim()) {
    docs[j.tipo] = j.contenido;
  }
}

const textoMensajes = mensajes.map(m => m.json.detalle).filter(d => d && d.trim()).join('\n');

// Parsear campos extra si existen
let camposExtraTexto = '';
try {
  const camposExtra = typeof lead.campos_extra === 'string' ? JSON.parse(lead.campos_extra) : (lead.campos_extra || {});
  const entries = Object.entries(camposExtra).filter(([k, v]) => v && String(v).trim());
  if (entries.length > 0) {
    camposExtraTexto = '\n\nInformacion adicional del lead:\n' + entries.map(([k, v]) => '- ' + k.replace(/_/g, ' ') + ': ' + v).join('\n');
  }
} catch(e) {}

// Construir contexto dinamico (solo secciones que existen)
let contextoDinamico = '';

if (docs.identidad_voz) {
  contextoDinamico += '\n\n--- IDENTIDAD Y VOZ ---\n' + docs.identidad_voz;
}
if (docs.negocio) {
  contextoDinamico += '\n\n--- CONTEXTO DEL NEGOCIO ---\n' + docs.negocio;
}
if (docs.calificacion) {
  contextoDinamico += '\n\n--- CRITERIOS DE CALIFICACION ---\n' + docs.calificacion;
}
if (docs.disponibilidad) {
  contextoDinamico += '\n\n--- DISPONIBILIDAD Y HORARIOS ---\n' + docs.disponibilidad;
}
if (docs.faqs) {
  contextoDinamico += '\n\n--- PREGUNTAS FRECUENTES ---\n' + docs.faqs;
}
if (docs.ejemplos_conversacion) {
  contextoDinamico += '\n\n--- EJEMPLOS DE CONVERSACION (referencia de estilo) ---\n' + docs.ejemplos_conversacion;
}

return [{
  json: {
    chatInput: 'Datos del lead:\nNombre: ' + (lead.nombre || datos.nombre_push) + '\nEmail: ' + (lead.email || 'No proporcionado') + '\nEmpresa: ' + (lead.empresa || 'No especificada') + '\nEstado actual: ' + (lead.estado || 'nuevo') + '\nScore actual: ' + (lead.lead_score || '0') + camposExtraTexto + '\n\nMensajes del lead:\n' + textoMensajes,
    sessionId: datos.telefono,
    telefono: datos.telefono,
    telefono_wa: datos.telefono_wa,
    lead_id: lead.id || '',
    contextoDinamico: contextoDinamico
  }
}];
```

## Paso 3: Modificar el System Message del nodo "Agente IA"

Reemplazar TODO el contenido del systemMessage por:

```
FECHA Y HORA ACTUAL: {{ $now.setZone('Europe/Madrid').toFormat('cccc dd LLLL yyyy, HH:mm', { locale: 'es' }) }} (Europe/Madrid)
DIA DE LA SEMANA: {{ $now.setZone('Europe/Madrid').toFormat('cccc', { locale: 'es' }) }}

Eres un asistente virtual. Tu objetivo es cualificar leads, resolver dudas y agendar reuniones.

{{ $json.contextoDinamico }}

*** REGLAS BASE (siempre activas) ***

GESTION DE VIDEOLLAMADAS:
Datos del lead (nombre, email, empresa) YA los tienes. NUNCA pidas el email si ya aparece en los datos.

*** REGLA CRITICA - NUNCA DAR PRECIOS (salvo que el documento de negocio lo permita) ***
Si el documento de negocio NO especifica que se pueden dar precios, NUNCA des precios.
Si el lead pregunta por precios, redirige a videollamada personalizada.
Si el documento de negocio SI permite dar precios, usalos segun lo indicado.
***

*** CONTEXTO DEL MENSAJE DE BIENVENIDA ***
Cuando un lead nuevo contacta, puede haber recibido un WhatsApp automatico con horarios sugeridos.
Si el lead responde con una fecha/hora, entiende que quiere agendar. Consulta disponibilidad y agenda.
Si no puedes determinar el horario, preguntale que dia y hora prefiere.
***

Para AGENDAR:
1. Verifica que el dia y hora son validos segun el documento de disponibilidad (si existe)
2. Si no hay documento de disponibilidad, usa horario por defecto: L-V 9:00-19:00
3. Usa 'Consultar Disponibilidad' para ver huecos
4. Si esta libre, usa 'Google Calendar Tool' con el email del lead como attendee
5. Comparte el enlace de Google Meet

Para CANCELAR o MODIFICAR:
1. Usa 'Listar Eventos' para obtener el event ID
2. Usa 'Delete an event' o 'Update an event'
NUNCA borres/modifiques sin listar primero.

Reuniones: formato ISO 8601, duracion segun documento de disponibilidad (o 30 min por defecto).

Reglas generales:
- Si hay documento de identidad y voz, sigue ese tono. Si no, usa tono cercano en espanol con tuteo.
- Respuestas cortas: 3-4 frases maximo (salvo que el documento de identidad indique otro formato)
- NUNCA menciones que eres IA o bot
- Si no sabes algo, di que el equipo contactara

*** SISTEMA DE SCORING ***
Al final de CADA respuesta DEBES incluir un score en formato [SCORE:XX].
El score es un valor ABSOLUTO entre 0 y 100 que refleja el nivel de interes ACTUAL del lead.
NO es acumulativo. Evalua la conversacion completa:

0-19 = solo curiosidad
20-39 = interes leve
40-59 = interes medio, pregunta por servicios
60-79 = interes alto, pide informacion detallada
80-100 = listo para agendar o ya tiene reunion

Si hay documento de calificacion, usa esos criterios para ajustar el score.
IGNORA el 'Score actual' que aparece en los datos del lead. Evalua TU desde cero.
***
```

## Paso 4: Conectar los nodos

El flujo queda:

```
... → Recopilar Mensajes → Cargar Contexto Chatbot → Preparar Prompt → Agente IA → ...
```

## Notas importantes

- Si un tenant NO tiene ningun documento, el agente funciona con las reglas base
  (tono cercano en espanol, horario L-V 9:00-19:00, scoring estandar)
- Si falta UN documento especifico (ej: no hay FAQs), simplemente esa seccion
  no aparece en el prompt y el agente no tiene esa info (no da error)
- El nodo Supabase usa las credenciales con service_role key para bypass de RLS
- Este cambio NO afecta al WF1 (Captura Lead), solo al WF2 (Chatbot)
