import { PantallaEmpresa } from '@/screens/PantallaEmpresa';

// Plan empresa (fase 15): la pestaña "Empresa", que ocupa el sitio de Planes (los planes
// con amigos no salen con el plan empresa). La misma pantalla que /empresa, sin "Volver".
export default function PestanaEmpresa() {
  return <PantallaEmpresa enPestana />;
}