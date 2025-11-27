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

/** Configuración visual de cada barra de la animación de audio */
interface WaveBarConfig {
  height: number;
  delay: number;
}

/**
 * Genera un patrón aleatorio de barras para la animación
 * @param bars Número de barras a generar
 */
const generateWaveConfig = (bars: number = 8): WaveBarConfig[] => {
  const result: WaveBarConfig[] = [];

  for (let i = 0; i < bars; i++) {
    // Altura entre 6px y 16px
    const height = 6 + Math.floor(Math.random() * 10);
    // Delay entre 0s y 0.8s
    const delay = Number((Math.random() * 0.8).toFixed(2));

    result.push({ height, delay });
  }

  return result;
};

/**
 * Renderiza las barras de la animación según el patrón recibido
 */
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

  // Controla la transición de fade-in/fade-out del título y el artista
  const [isAnimating, setIsAnimating] = useState(false);

  // Patrón actual de barras para la animación de audio
  const [waveConfig, setWaveConfig] = useState<WaveBarConfig[]>(() =>
    generateWaveConfig()
  );

  // Consulta periódicamente al backend para mantener la canción sincronizada
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await invoke<SongInfo>("check_music");
        setSong(info);
      } catch (e) {}
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Envía comandos de control al backend y sincroniza el estado local
   * Maneja play/pause, anterior y siguiente, además del patrón de barras
   */
  const sendControl = async (action: string) => {
    if (action === "play_pause") {
      setSong((prev) => ({ ...prev, is_playing: !prev.is_playing }));
      await invoke("control_media", { action });
    } else if (action === "prev" || action === "next") {
      // Inicia el fade-out del texto actual
      setIsAnimating(true);

      // Cambia de pista en el backend
      await invoke("control_media", { action });

      // Espera a que termine el fade-out
      await new Promise((resolve) => setTimeout(resolve, 330));

      // Actualiza la información de la nueva canción
      const newInfo = await invoke<SongInfo>("check_music");
      setSong(newInfo);

      // Regenera el patrón de barras para la nueva pista
      setWaveConfig(generateWaveConfig());

      // Activa el fade-in del texto
      setIsAnimating(false);
    }
  };

  return (
    <div className="card">
      {/* Panel de información de la canción y animación */}
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

          {/* Animación de barras usando el patrón actual */}
          <WaveAnimation isPlaying={song.is_playing} config={waveConfig} />
        </div>
      </div>

      {/* Controles de reproducción */}
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
