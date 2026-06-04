export interface AvatarCliente {
  id: string
  tenant_id: string
  tipo: 'b2b' | 'b2c'
  titulo: string
  // Shared
  sector: string
  problemas: string
  motivaciones: string
  objeciones_tipicas: string
  presupuesto: string
  canales_preferidos: string
  notas: string
  // B2B specific
  tamano_empresa: string
  cargo_decisor: string
  // B2C specific
  rango_edad: string
  genero: string
  ubicacion: string
  estilo_vida: string
  frustraciones: string
  // Meta
  generado_por: 'usuario' | 'agente' | 'mixto'
  created_at: string
  updated_at: string
}
