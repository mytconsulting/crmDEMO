export interface Profile {
  id: string
  email: string
  company_name: string
  role: 'admin' | 'client'
  is_active: boolean
  created_at: string
  suspended_at?: string
}

export interface TenantConfig {
  id: string
  tenant_id: string
  custom_fields: CustomField[]
  created_at: string
  updated_at: string
}

export interface CustomField {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select'
  required: boolean
  options?: string
}
