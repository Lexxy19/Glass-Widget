#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

// Helper para obtener la sesión actual
async fn get_session() -> Result<windows::Media::Control::GlobalSystemMediaTransportControlsSession, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    
    manager.GetCurrentSession().map_err(|_| "No session".to_string())
}

// 1. LEER INFO (Ahora incluye si está pausado o no)
#[tauri::command]
async fn check_music() -> std::result::Result<serde_json::Value, String> {
    let session = match get_session().await {
        Ok(s) => s,
        Err(_) => return Ok(serde_json::json!({ "title": "Pausado", "artist": "...", "is_playing": false })),
    };

    let info = session.TryGetMediaPropertiesAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
    let title = info.Title().map_err(|_| "")?.to_string();
    let artist = info.Artist().map_err(|_| "")?.to_string();

    // Verificamos si está sonando
    let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
    let status = playback_info.PlaybackStatus().map_err(|e| e.to_string())?;
    let is_playing = status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

    Ok(serde_json::json!({ 
        "title": title, 
        "artist": artist, 
        "is_playing": is_playing 
    }))
}

// 2. CONTROLAR MÚSICA (Nueva función)
#[tauri::command]
async fn control_media(action: String) -> Result<(), String> {
    let session = get_session().await?;

    match action.as_str() {
        "play_pause" => { session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?; },
        "next" => { session.TrySkipNextAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?; },
        "prev" => { session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?; },
        _ => {}
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        // Registramos AMBAS funciones
        .invoke_handler(tauri::generate_handler![check_music, control_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}