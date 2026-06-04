-- 1. Añadir tenant_id a la tabla leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();

-- 2. Activar Seguridad por Filas (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. Crear política de acceso (Solo ver mis datos)
CREATE POLICY "Users can only access their own leads"
ON leads
FOR ALL
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

-- 4. Función y Trigger para asignar el tenant_id automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el lead no tiene tenant_id, le asignamos el del usuario actual
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_created ON leads;
CREATE TRIGGER on_lead_created
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_lead();
