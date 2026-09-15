import { useState, useRef } from "react";
import { Camera } from "lucide-react";

export default function EditarPerfil() {
  const [foto, setFoto] = useState(null); // URL de vista previa
  const [colorInicial, setColorInicial] = useState("#4F7CFF");
  const inputFileRef = useRef(null);

  const coloresDisponibles = [
    "#7C5CFC", "#2FBF8C", "#F0653C",
    "#E85D8A", "#4F7CFF", "#D98A2B", "#8FBF2A",
  ];

  // Se dispara al hacer click en el avatar
  const abrirGaleria = () => {
    inputFileRef.current?.click();
  };

  // Se dispara cuando el usuario elige una imagen
  const manejarCambioFoto = (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    // Validaciones básicas
    if (!archivo.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen.");
      return;
    }
    const tamañoMaxMB = 5;
    if (archivo.size > tamañoMaxMB * 1024 * 1024) {
      alert(`La imagen debe pesar menos de ${tamañoMaxMB}MB.`);
      return;
    }

    // Genera una URL temporal para previsualizar la imagen
    const urlPreview = URL.createObjectURL(archivo);
    setFoto(urlPreview);

    // Aquí subirías el archivo a tu backend / storage:
    // subirFotoPerfil(archivo).then(url => guardarEnBackend(url));
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.header}>
        <span style={estilos.volver}>← Volver</span>
        <h2 style={estilos.titulo}>Editar perfil</h2>
        <span style={estilos.cerrar}>×</span>
      </div>

      {/* Avatar clickeable */}
      <div style={estilos.avatarWrapper} onClick={abrirGaleria}>
        {foto ? (
          <img src={foto} alt="Foto de perfil" style={estilos.avatarImg} />
        ) : (
          <div style={{ ...estilos.avatarPlaceholder, background: colorInicial }}>
            SE
          </div>
        )}
        <div style={estilos.iconoCamara}>
          <Camera size={16} color="#fff" />
        </div>
      </div>
      <p style={estilos.textoCambiar} onClick={abrirGaleria}>
        Cambiar foto
      </p>

      {/* Input oculto: en móvil abre la galería, en desktop el explorador */}
      <input
        type="file"
        accept="image/*"
        ref={inputFileRef}
        onChange={manejarCambioFoto}
        style={{ display: "none" }}
      />

      {/* Selector de color (fallback si no hay foto) */}
      {!foto && (
        <div style={estilos.colores}>
          {coloresDisponibles.map((color) => (
            <button
              key={color}
              onClick={() => setColorInicial(color)}
              style={{
                ...estilos.colorBtn,
                background: color,
                outline: color === colorInicial ? "2px solid #fff" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const estilos = {
  contenedor: {
    background: "#1A1A22",
    borderRadius: 16,
    padding: 24,
    width: 380,
    color: "#E8E8ED",
    fontFamily: "sans-serif",
    textAlign: "center",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  volver: { color: "#9A9AA6", fontSize: 14 },
  titulo: { fontSize: 16, margin: 0 },
  cerrar: { color: "#9A9AA6", fontSize: 20, cursor: "pointer" },
  avatarWrapper: { position: "relative", width: 100, height: 100, margin: "0 auto", cursor: "pointer" },
  avatarImg: { width: 100, height: 100, borderRadius: "50%", objectFit: "cover" },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 32, fontWeight: 600, color: "#fff",
  },
  iconoCamara: {
    position: "absolute", bottom: 2, right: 2,
    background: "#333", borderRadius: "50%",
    width: 28, height: 28, display: "flex",
    alignItems: "center", justifyContent: "center",
    border: "2px solid #1A1A22",
  },
  textoCambiar: { fontSize: 13, color: "#8B8BFF", marginTop: 10, cursor: "pointer" },
  colores: { display: "flex", justifyContent: "center", gap: 12, marginTop: 20 },
  colorBtn: { width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer" },
};