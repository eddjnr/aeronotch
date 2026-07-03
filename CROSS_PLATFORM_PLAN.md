# Plano de Implementação: Suporte Multiplataforma (macOS & Linux) para o AeroNotch

Este documento apresenta o plano passo a passo para portar o AeroNotch, atualmente otimizado para Windows, para funcionar nativamente no **macOS** e **Linux**.

---

## Objetivo

Remover o acoplamento rígido com APIs Win32 e WinRT no backend Rust (`src-tauri`), isolar lógicas específicas por sistema operacional utilizando compilação condicional (`#[cfg]`), e resolver desafios de posicionamento e transparência de janelas em outros ecossistemas.

---

## Cronograma de Atividades

### Fase 1: Ajuste de Dependências no `Cargo.toml`

Atualmente, as crates `windows` e `clipboard-win` são instaladas e compiladas para qualquer plataforma, o que causa erro de compilação imediato no macOS e Linux.

1. **Modificar o arquivo** [Cargo.toml](file:///c:/Users/User/Documents/projects/winotch/src-tauri/Cargo.toml):
   - Remover `windows` e `clipboard-win` da seção geral `[dependencies]`.
   - Criar blocos de dependências específicas por plataforma:

     ```toml
     [target.'cfg(target_os = "windows")'.dependencies]
     windows = { version = "0.58.0", features = [
         "Media_Control",
         "Storage_Streams",
         "Foundation",
         "Foundation_Collections",
         "Win32_Graphics_Dwm",
         "Win32_Foundation",
         "Win32_UI_WindowsAndMessaging",
         "Win32_UI_Controls",
         "Win32_System_Memory",
         "Win32_System_DataExchange",
         "Win32_UI_Shell",
         "Win32_System_SystemServices",
     ] }
     clipboard-win = "5.4.0"

     [target.'cfg(target_os = "linux")'.dependencies]
     mpris = "2.0.1"      # Para comunicação D-Bus com players de mídia
     zbus = "4.0.0"       # D-Bus geral (para clipboard e chamadas ao file manager)

     [target.'cfg(target_os = "macos")'.dependencies]
     objc2 = "0.3.0"      # Para chamadas nativas à API do Cocoa (NSPasteboard, MediaPlayer)
     ```

---

## Fase 2: Lógica de Controle de Mídia (`media.rs` e `lib.rs`)

O arquivo [media.rs](file:///c:/Users/User/Documents/projects/winotch/src-tauri/src/media.rs) precisará ser reestruturado para implementar as pontes de comunicação com o player de áudio do sistema operacional de destino.

1. **Abstrair a lógica em uma estrutura condicional**:
   - Renomear o arquivo atual para `media_windows.rs` ou isolar o código de dentro dele com blocos `#[cfg(target_os = "windows")]`.
   - Adicionar a estrutura para o **Linux**:
     - Usar a crate `mpris` para escutar e controlar players MPRIS ativos (como Spotify, VLC, Chrome, Firefox).
     - Obter os metadados usando a interface padrão MPRIS. O D-Bus retorna a URL da arte do álbum (frequentemente um arquivo temporário local ou link HTTP).
   - Adicionar a estrutura para o **macOS**:
     - Integrar com o framework `MediaPlayer` (através da crate `objc2` ou invocando um utilitário Swift compilado em background).
     - Se o acesso nativo for muito complexo de início, usar uma ponte AppleScript simples que consulte o Spotify e o Apple Music ativos, convertendo para JSON.
2. **Ajustar Seeking (`media_seek`)** em [lib.rs](file:///c:/Users/User/Documents/projects/winotch/src-tauri/src/lib.rs):
   - Isolar a chamada nativa do WinRT e implementar a respectiva chamada de posicionamento de timeline no MPRIS (Linux) e AppleScript/Cocoa (macOS).

---

## Fase 3: Copiar Arquivos para o Clipboard (`copy_files_to_clipboard`)

A implementação atual em [lib.rs](file:///c:/Users/User/Documents/projects/winotch/src-tauri/src/lib.rs) utiliza alocação Win32 (`GlobalAlloc` e `CF_HDROP`).

1. **Isolar a função existente**:
   - Renomear/marcar a função atual como `#[cfg(target_os = "windows")] fn copy_files_to_clipboard(...)`.
2. **Implementar a versão para macOS**:
   - Usar `NSPasteboard` para escrever `NSPasteboardTypeFileURL` contendo a lista de caminhos absolutos dos arquivos.
3. **Implementar a versão para Linux**:
   - Usar comunicação com o clipboard do X11/Wayland para definir o MIME type `text/uri-list`, com cada arquivo formatado como `file://<caminho_absoluto>`.

---

## Fase 4: Comandos de Processo Nativos (`reveal_in_explorer` e `open_file_on_disk`)

Refatorar comandos no arquivo [lib.rs](file:///c:/Users/User/Documents/projects/winotch/src-tauri/src/lib.rs) para usar as alternativas nativas.

1. **Abrir Arquivo (`open_file_on_disk`)**:
   - Remover a execução direta de `cmd /c start`.
   - Utilizar a API da biblioteca `tauri-plugin-opener` (que já está configurada no projeto) chamando `app_handle.opener().open_path(...)`, que é multiplataforma por padrão.
2. **Revelar no Gerenciador de Arquivos (`reveal_in_explorer`)**:
   - Renomear a função para `reveal_in_file_manager`.
   - Adicionar lógica condicional para executar os respectivos comandos:
     - **Windows**: `explorer /select, <path>` (mantém o comportamento atual).
     - **macOS**: Executar `Command::new("open").args(&["-R", &path])` (revela diretamente no Finder).
     - **Linux**: Enviar mensagem D-Bus para `org.freedesktop.FileManager1` na rota `/org/freedesktop/FileManager1` método `ShowItems`. Caso falhe, abrir a pasta pai utilizando `xdg-open`.

---

## Fase 5: Monitor de Sistema (`system_info.rs`)

1. **Nome da GPU**:
   - **Windows**: Mantém a chamada CIM/WMI via PowerShell.
   - **macOS**: Executar `system_profiler SPDisplaysDataType` e ler a linha contendo "Chipset Model" para identificar a GPU (ex: Apple M1 Pro, AMD Radeon).
   - **Linux**: Fazer leitura em `/sys/class/drm/card*/device/uevent` ou obter o nome executando `lspci | grep -E "VGA|3D"`.
2. **Cálculo da CPU**:
   - No Windows, mantém a leitura de `GetSystemTimes` para maior consistência. No Linux e macOS, a crate `sysinfo` nativa fará a leitura global.

---

## Fase 6: Ajuste de Interface, Janela e Posicionamento (CSS/Frontend)

A adaptação visual para outras plataformas necessita de atenção à usabilidade física do widget:

1. **Desafio do macOS (Menu Bar e Notch)**:
   - A barra de menu padrão do macOS tem cerca de 22 a 24 pixels de altura no topo da tela. Colocar a ilha em `y = 0` causará colisão visual.
   - **Solução**: No macOS, calcular a área útil da tela (`work_area`) em vez do tamanho total do monitor. Posicionar o AeroNotch em `y = menu_bar_height` (ou seja, colado logo abaixo da barra de menu) ou deslocá-lo para ser um widget flutuante no topo-direito.
2. **Desafio do Linux (Wayland e Window Managers)**:
   - Sob o protocolo Wayland, muitas ações de posicionamento absoluto de janelas são bloqueadas pelo compositor.
   - **Solução**: Garantir que as propriedades de janela `transparent: true`, `decorations: false` e `alwaysOnTop: true` estejam bem configuradas no [tauri.conf.json](file:///c:/Users/User/Documents/projects/winotch/src-tauri/tauri.conf.json) e documentar a necessidade de regras de compositor em ambientes como i3/Hyprland para impedir o tiling forçado da ilha.

---

## Verificação e Empacotamento

Durante as fases de teste, você poderá compilar a aplicação de forma independente em cada plataforma:

- **Para testar no macOS**:
  ```bash
  pnpm tauri dev
  # Para compilar em formato .dmg ou .app:
  pnpm tauri build
  ```
- **Para testar no Linux**:
  ```bash
  pnpm tauri dev
  # Para compilar em formato .deb ou AppImage:
  pnpm tauri build
  ```
