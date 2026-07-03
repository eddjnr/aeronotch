export const translations = {
  en: {
    // Sidebar Tabs
    tabGeneral: "General",
    tabWidgets: "Widgets",
    tabIntegrations: "Integrations",
    tabAbout: "About",
    brandSubtitle: "Preferences",

    // General Tab
    generalTitle: "General",
    generalSubtitle:
      "Configure window positioning, transparency, and launch properties.",
    groupAppearance: "Appearance & Placement",
    lblScreenPosition: "Screen Position",
    posLeft: "Left",
    posCenter: "Center",
    posRight: "Right",
    lblOpacity: "Island Opacity",
    lblMonitorPlacement: "Monitor Placement",
    monitorPrimary: "Primary Monitor Only",
    monitorAll: "All Monitors",
    monitorSpecific: "Monitor {index}",
    groupSystem: "System Preferences",
    lblLaunchStartup: "Launch on Startup",
    lblResetDefaults: "Reset to Defaults",
    btnResetSettings: "Reset Settings",
    btnBrowse: "Browse...",

    // Language Settings Group
    groupLanguage: "Language & Region",
    lblLanguage: "Language",
    langEn: "English",
    langPtBR: "Português (Brasil)",

    // Widgets Tab
    widgetsTitle: "Widgets",
    widgetsSubtitle:
      "Enable or disable individual information layers on the island.",
    groupActiveModules: "Active Modules",
    lblMusicWidget: "Media Player",
    lblCalendarWidget: "Calendar Grid",
    lblSystemWidget: "System Monitors",
    lblWeatherWidget: "Weather Details",
    lblClockWidget: "Digital Clock",
    lblTrayWidget: "File Tray",

    // Right Corner
    lblRightCorner: "Right Corner (Compact)",
    lblRightCornerDesc: "Choose what appears on the right side when the island is compact.",
    rightCornerWidgets: "Widgets (Weather / System)",
    rightCornerCustom: "Custom Image / GIF",
    lblCustomUrl: "Image URL (GIF, PNG, etc.)",
    phCustomUrl: "https://example.com/animation.gif",

    // Upcoming Extensions
    lblUpcomingExtensions: "Upcoming Extensions",
    lblPlanned: "Planned",
    lblQuickApps: "Quick Apps",
    lblTodos: "To-dos & Tasks",

    // Integrations Tab
    integrationsTitle: "Integrations",
    integrationsSubtitle:
      "Link with cloud calendars using direct iCal/ICS feed URLs.",
    lblCalendarSub: "Calendar Subscription",
    descCalendarSubConnected: "Connected and syncing in real-time",
    descCalendarSubDisconnected:
      "Display schedules from Google, Outlook, or Apple Calendar.",
    btnDisconnect: "Disconnect",
    lblSecretIcsAddress: "Secret Address in iCal format (.ics Link)",
    phIcsLink: "https://calendar.google.com/calendar/ical/.../basic.ics",
    btnSyncCalendar: "Sync Calendar",
    btnSyncing: "Syncing...",
    lblSyncedLink: "Synced Link",
    lblActiveSync: "Active Sync (updates every 15 minutes)",
    instructionsTitle: "How to find your iCal link:",
    instructionStep1: "Open Google Calendar in your web browser.",
    instructionStep2:
      "Hover over your calendar name in the left list, click the 3 dots icon, and choose Settings and sharing.",
    instructionStep3:
      "Scroll down to the Integrate calendar section and copy the Secret address in iCal format.",
    lblGoogleCalendar: "Google Calendar",

    // About Tab
    aboutTitle: "About",
    aboutSubtitle:
      "AeroNotch is a premium, customizable desktop accessory for Windows.",
    lblVersion: "Version 0.1.8 (Stable)",
    lblDescription:
      "AeroNotch is an Apple-inspired Dynamic Island utility built with Tauri, Rust, and React, bringing elegant information delivery and system controls to the Windows Desktop bezel.",
    lblBuiltWith: "Built by pair-programming with Antigravity",

    // General Widget Labels
    loading: "Loading...",
    noEvents: "No events for this day",
    allDay: "All Day",
    noTitle: "No Title",
    noMusic: "No music playing",
    feelsLike: "Feels like {temp}°",

    // Weather condition codes
    weather_0: "Clear sky",
    weather_1: "Mainly clear",
    weather_2: "Partly cloudy",
    weather_3: "Overcast",
    weather_45: "Foggy",
    weather_48: "Foggy",
    weather_51: "Drizzle",
    weather_53: "Drizzle",
    weather_55: "Drizzle",
    weather_56: "Freezing drizzle",
    weather_57: "Freezing drizzle",
    weather_61: "Rain",
    weather_63: "Rain",
    weather_65: "Rain",
    weather_66: "Freezing rain",
    weather_67: "Freezing rain",
    weather_71: "Snow",
    weather_73: "Snow",
    weather_75: "Snow",
    weather_77: "Snow grains",
    weather_80: "Rain showers",
    weather_81: "Rain showers",
    weather_82: "Rain showers",
    weather_85: "Snow showers",
    weather_86: "Snow showers",
    weather_95: "Thunderstorm",
    weather_96: "Thunderstorm with hail",
    weather_99: "Thunderstorm with hail",
    weather_unknown: "Unknown",

    // System Widget
    sysCpuUtil: "util",
    sysRamAlloc: "alloc",
    sysGpuCore: "core",
    sysDiskUsed: "used",
    sysProcessor: "Processor",
    sysMemory: "Memory",
    sysRamLabel: "Random Access Memory",
    sysGraphics: "Graphics",
    sysStorage: "Storage",
    sysDrive: "Drive",
    sysDriveOf: "{used} GB of {total} GB ({free} GB free)",
    sysUsed: "Used",
    sysTotal: "Total",
    sysAvailable: "Available",
    sysLive: "LIVE",
    sysCpuTempNaTooltip:
      "CPU temperature is not natively exposed by Windows. Run this app as Administrator, or launch LibreHardwareMonitor / OpenHardwareMonitor to display it.",
    sysGpuTempNaTooltip:
      "GPU temperature could not be read. Ensure your graphics drivers are installed, or launch LibreHardwareMonitor / OpenHardwareMonitor.",

    // Island Layout
    layHome: "Home",
    laySystem: "System",
    layWeather: "Weather",
    layLoadingWeather: "Loading weather data...",
    layConditionDetails: "Condition Details",
    layHumidity: "Humidity",
    layWindSpeed: "Wind Speed",
    layThermalSensation: "Thermal Sensation",
    layFeelsLike: "Feels like",
    layTray: "Tray",
    trayEmpty: "Drag and drop files here",
    trayCopy: "Copy",
    trayRename: "Rename",
    trayRemove: "Remove from tray",
    trayReveal: "Reveal in Explorer",
    trayOpen: "Open",
    trayDropOverlay: "Drop files to add to Tray",
  },
  "pt-BR": {
    // Sidebar Tabs
    tabGeneral: "Geral",
    tabWidgets: "Widgets",
    tabIntegrations: "Integrações",
    tabAbout: "Sobre",
    brandSubtitle: "Preferências",

    // General Tab
    generalTitle: "Geral",
    generalSubtitle:
      "Configure o posicionamento da janela, transparência e propriedades de inicialização.",
    groupAppearance: "Aparência e Posicionamento",
    lblScreenPosition: "Posição da Tela",
    posLeft: "Esquerda",
    posCenter: "Centro",
    posRight: "Direita",
    lblOpacity: "Opacidade da Ilha",
    lblMonitorPlacement: "Exibição nos Monitores",
    monitorPrimary: "Apenas Monitor Principal",
    monitorAll: "Todos os Monitores",
    monitorSpecific: "Monitor {index}",
    groupSystem: "Preferências do Sistema",
    lblLaunchStartup: "Iniciar com o Windows",
    lblResetDefaults: "Restaurar Padrões",
    btnResetSettings: "Restaurar",
    btnBrowse: "Procurar...",

    // Language Settings Group
    groupLanguage: "Idioma e Região",
    lblLanguage: "Idioma",
    langEn: "English",
    langPtBR: "Português (Brasil)",

    // Widgets Tab
    widgetsTitle: "Widgets",
    widgetsSubtitle:
      "Ative ou desative camadas individuais de informação na ilha.",
    groupActiveModules: "Módulos Ativos",
    lblMusicWidget: "Reprodutor de Mídia",
    lblCalendarWidget: "Grade do Calendário",
    lblSystemWidget: "Monitores do Sistema",
    lblWeatherWidget: "Detalhes do Clima",
    lblClockWidget: "Relógio Digital",
    lblTrayWidget: "Bandeja de Arquivos",

    // Right Corner
    lblRightCorner: "Canto Direito (Compacto)",
    lblRightCornerDesc: "Escolha o que aparece no lado direito quando a ilha está compacta.",
    rightCornerWidgets: "Widgets (Clima / Sistema)",
    rightCornerCustom: "Imagem Personalizada / GIF",
    lblCustomUrl: "URL da Imagem (GIF, PNG, etc.)",
    phCustomUrl: "https://exemplo.com/animacao.gif",

    // Upcoming Extensions
    lblUpcomingExtensions: "Próximas Extensões",
    lblPlanned: "Planejado",
    lblQuickApps: "Apps Rápidos",
    lblTodos: "Tarefas e Afazeres",

    // Integrations Tab
    integrationsTitle: "Integrações",
    integrationsSubtitle:
      "Vincule calendários na nuvem usando URLs de feed iCal/ICS diretas.",
    lblCalendarSub: "Assinatura de Calendário",
    descCalendarSubConnected: "Conectado e sincronizando em tempo real",
    descCalendarSubDisconnected:
      "Exiba agendas do Google, Outlook ou Apple Calendar.",
    btnDisconnect: "Desconectar",
    lblSecretIcsAddress: "Endereço Secreto em formato iCal (Link .ics)",
    phIcsLink: "https://calendar.google.com/calendar/ical/.../basic.ics",
    btnSyncCalendar: "Sincronizar Calendário",
    btnSyncing: "Sincronizando...",
    lblSyncedLink: "Link Sincronizado",
    lblActiveSync: "Sincronização Ativa (atualiza a cada 15 minutos)",
    instructionsTitle: "Como encontrar seu link iCal:",
    instructionStep1: "Abra o Google Agenda no seu navegador web.",
    instructionStep2:
      "Passe o mouse sobre o nome da agenda na lista à esquerda, clique no ícone de 3 pontos e escolha Configurações e compartilhamento.",
    instructionStep3:
      "Role até a seção Integrar agenda e copie o Endereço secreto em formato iCal.",
    lblGoogleCalendar: "Google Agenda",

    // About Tab
    aboutTitle: "Sobre",
    aboutSubtitle:
      "O AeroNotch é um acessório de desktop premium e personalizável para o Windows.",
    lblVersion: "Versão 0.1.8 (Estável)",
    lblDescription:
      "O AeroNotch é um utilitário de Dynamic Island inspirado na Apple, construído com Tauri, Rust e React, trazendo entrega elegante de informações e controles de sistema para a moldura do Windows.",
    lblBuiltWith: "Desenvolvido em pair-programming com Antigravity",

    // General Widget Labels
    loading: "Carregando...",
    noEvents: "Sem eventos para este dia",
    allDay: "Dia Inteiro",
    noTitle: "Sem Título",
    noMusic: "Nenhuma música tocando",
    feelsLike: "Sensação térmica {temp}°",

    // Weather condition codes
    weather_0: "Céu limpo",
    weather_1: "Predominantemente limpo",
    weather_2: "Parcialmente nublado",
    weather_3: "Encoberto",
    weather_45: "Nevoeiro",
    weather_48: "Nevoeiro",
    weather_51: "Chuvisco",
    weather_53: "Chuvisco",
    weather_55: "Chuvisco",
    weather_56: "Chuvisco congelante",
    weather_57: "Chuvisco congelante",
    weather_61: "Chuva",
    weather_63: "Chuva",
    weather_65: "Chuva",
    weather_66: "Chuva congelante",
    weather_67: "Chuva congelante",
    weather_71: "Neve",
    weather_73: "Neve",
    weather_75: "Neve",
    weather_77: "Grãos de neve",
    weather_80: "Pancadas de chuva",
    weather_81: "Pancadas de chuva",
    weather_82: "Pancadas de chuva",
    weather_85: "Pancadas de neve",
    weather_86: "Pancadas de neve",
    weather_95: "Tempestade",
    weather_96: "Tempestade com granizo",
    weather_99: "Tempestade com granizo",
    weather_unknown: "Desconhecido",

    // System Widget
    sysCpuUtil: "util",
    sysRamAlloc: "aloc",
    sysGpuCore: "núcleo",
    sysDiskUsed: "usado",
    sysProcessor: "Processador",
    sysMemory: "Memória",
    sysRamLabel: "Memória de Acesso Aleatório",
    sysGraphics: "Gráficos",
    sysStorage: "Armazenamento",
    sysDrive: "Disco",
    sysDriveOf: "{used} GB de {total} GB ({free} GB livres)",
    sysUsed: "Usado",
    sysTotal: "Total",
    sysAvailable: "Disponível",
    sysLive: "AO VIVO",
    sysCpuTempNaTooltip:
      "A temperatura da CPU não é exposta nativamente pelo Windows. Execute este aplicativo como Administrador ou inicie o LibreHardwareMonitor / OpenHardwareMonitor para exibi-la.",
    sysGpuTempNaTooltip:
      "Não foi possível ler a temperatura da GPU. Certifique-se de que os drivers de vídeo estão instalados ou inicie o LibreHardwareMonitor / OpenHardwareMonitor.",

    // Island Layout
    layHome: "Início",
    laySystem: "Sistema",
    layWeather: "Clima",
    layLoadingWeather: "Carregando dados climáticos...",
    layConditionDetails: "Detalhes das Condições",
    layHumidity: "Umidade",
    layWindSpeed: "Velocidade do Vento",
    layThermalSensation: "Sensação Térmica",
    layFeelsLike: "Sensação de",
    layTray: "Bandeja",
    trayEmpty: "Arraste e solte arquivos aqui",
    trayCopy: "Copiar",
    trayRename: "Renomear",
    trayRemove: "Remover da bandeja",
    trayReveal: "Revelar no Explorer",
    trayOpen: "Abrir",
    trayDropOverlay: "Solte os arquivos para adicionar à Bandeja",
  },
};
