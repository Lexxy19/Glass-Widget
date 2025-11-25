// src/App.tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
// Borra: import { getCurrentWindow } from "@tauri-apps/api/window"; 
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import portada from "./assets/portada.jpg";
import "./App.css";

interface SongInfo {
  title: string;
  artist: string;
  is_playing: boolean;
}

const WaveAnimation = ({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className={`wave-container ${!isPlaying ? 'paused' : ''}`}>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
      <div className="wave-bar"></div>
    </div>
  );
};

function App() {
  const [song, setSong] = useState<SongInfo>({ 
    title: "Esperando...", 
    artist: "...",
    is_playing: false
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await invoke<SongInfo>("check_music");
        setSong(info);
      } catch (e) { }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendControl = async (action: string) => {
    if (action === "play_pause") {
        setSong(prev => ({ ...prev, is_playing: !prev.is_playing }));
        await invoke("control_media", { action }); // Es buena práctica mandar la señal también
    } 
    else if (action === "prev" || action === "next") {
        // 1. Iniciamos la animación de SALIDA (Fade Out) con el texto ACTUAL
        setIsAnimating(true);

        // 2. Mandamos la señal al backend para que cambie la canción físicamente
        await invoke("control_media", { action });

        // 3. Esperamos EXACTAMENTE lo que dura tu animación CSS
        // Nota: Ajusté el tiempo a 300ms (0.3s) para que se sienta ágil. 3s es eterno.
        await new Promise(resolve => setTimeout(resolve, 330));

        // 4. Obtenemos la nueva info (mientras el texto está invisible/opacidad 0)
        const newInfo = await invoke<SongInfo>("check_music");
        
        // 5. AQUI actualizamos el texto. El usuario no ve el cambio brusco porque opacity es 0.
        setSong(newInfo);

        // 6. Quitamos la animación de salida, lo que provocará el Fade In automático (si tu CSS está bien)
        setIsAnimating(false);
    }
};

  return (
    <div className="card"> 
      
      {/* Lado Izquierdo */}
      <div className="content">
        <div style={{ backgroundImage: `url(${portada})` }} className="icon-container"></div>
        <div className="text-info">
          <h1 className={isAnimating ? 'fade-out' : 'fade-in'}>{song.title || "Sin música"}</h1>
          <p className={isAnimating ? 'fade-out' : 'fade-in'}>{song.artist || "Reproductor inactivo"}</p>
          <WaveAnimation isPlaying={song.is_playing} />
        </div>
      </div>

      {/* Lado Derecho */}
      <div className="controls">
        <button className="btn-secondary" onClick={() => sendControl("prev")}>
            <SkipBack size={20} fill="currentColor" />
        </button>

        <button className="btn-primary" onClick={() => sendControl("play_pause")}>
            {song.is_playing ? (
                <Pause size={24} fill="currentColor" />
            ) : (
                <Play size={24} fill="currentColor" className="play-icon"/>
            )}
        </button>

        <button className="btn-secondary" onClick={() => sendControl("next")}>
            <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

    </div>
  );
}

export default App;