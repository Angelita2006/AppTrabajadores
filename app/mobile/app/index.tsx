import { useTrabajador } from "../src/modules/trabajadores/store/UsuarioContext";

export default function Index() {
  let {
    usuarioActual,
    setUsuarioActual,
    trabajadorActual,
    setEmpresas,
    setEmpresaSeleccionada,
    empresaSeleccionada,
  } = useTrabajador();
}
