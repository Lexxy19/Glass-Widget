// src/App.tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import portada from "./assets/portada.jpg";
import "./App.css";

interface SongInfo {
  title: string;
  artist: string;
  is_playing: boolean;
}

/** Configuración de cada barrita de la wave */
interface WaveBarConfig {
  height: number; // en px
  delay: number;  // en segundos
}

/** Genera un patrón aleatorio de barras */
const generateWaveConfig = (bars: number = 8): WaveBarConfig[] => {
  const result: WaveBarConfig[] = [];

  for (let i = 0; i < bars; i++) {
    // altura entre 4px y 14px aprox
    const height = 6 + Math.floor(Math.random() * 10);
    // delay entre 0s y 0.8s
    const delay = Number((Math.random() * 0.8).toFixed(2));

    result.push({ height, delay });
  }

  return result;
};

const WaveAnimation = ({
  isPlaying,
  config,
}: {
  isPlaying: boolean;
  config: WaveBarConfig[];
}) => {
  return (
    <div className={`wave-container ${!isPlaying ? "paused" : ""}`}>
      {config.map((bar, index) => (
        <div
          key={index}
          className="wave-bar"
          style={{
            height: `${bar.height}px`,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

function App() {
  const [song, setSong] = useState<SongInfo>({
    title: "Esperando...",
    artist: "...",
    is_playing: false,
  });

  const [isAnimating, setIsAnimating] = useState(false);

  /** Estado del patrón actual de la wave */
  const [waveConfig, setWaveConfig] = useState<WaveBarConfig[]>(() =>
    generateWaveConfig()
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await invoke<SongInfo>("check_music");
        setSong(info);
      } catch (e) {}
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendControl = async (action: string) => {
    if (action === "play_pause") {
      setSong((prev) => ({ ...prev, is_playing: !prev.is_playing }));
      await invoke("control_media", { action });
    } else if (action === "prev" || action === "next") {
      // 1. Fade-out del texto actual
      setIsAnimating(true);

      // 2. Cambiamos canción en el backend
      await invoke("control_media", { action });

      // 3. Esperamos a que termine el fade-out
      await new Promise((resolve) => setTimeout(resolve, 330));

      // 4. Obtenemos info de la nueva canción
      const newInfo = await invoke<SongInfo>("check_music");
      setSong(newInfo);

      // 5. Generamos un nuevo patrón de wave SOLO cuando cambias de canción
      setWaveConfig(generateWaveConfig());

      // 6. Volvemos a hacer fade-in del texto
      setIsAnimating(false);
    }
  };

  return (
    <div className="card">
      {/* Lado Izquierdo */}
      <div className="content">
        <div
          style={{ backgroundImage: `url(${portada})` }}
          className="icon-container"
        ></div>
        <div className="text-info">
          <h1 className={isAnimating ? "fade-out" : "fade-in"}>
            <span>{song.title || "Sin música"}</span>
          </h1>
          <p className={isAnimating ? "fade-out" : "fade-in"}>
            {song.artist || "Reproductor inactivo"}
          </p>

          {/* Ahora la wave recibe el patrón aleatorio */}
          <WaveAnimation isPlaying={song.is_playing} config={waveConfig} />
        </div>
      </div>

      {/* Lado Derecho */}
      <div className="controls">
        <button className="btn-secondary" onClick={() => sendControl("prev")}>
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          className="btn-primary"
          onClick={() => sendControl("play_pause")}
        >
          {song.is_playing ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" className="play-icon" />
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
