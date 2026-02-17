
export interface ClientTheme {
    id: string;
    name: string;
    logoUrl: string;
    colors: {
        primary: string; // Main brand color
        secondary: string; // Secondary/sidebar color
    }
}

export const CLIENT_CONFIGS: Record<string, ClientTheme> = {
    'sasco': {
        id: 'sasco',
        name: 'SASCO',
        logoUrl: 'https://media.majarracdn.cloud/manhom/mgmt/images/6575/1730119204/%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A9-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9-%D9%84%D8%AE%D8%AF%D9%85%D8%A7%D8%AA-%D8%A7%D9%84%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D9%85.webp',
        colors: { 
            primary: '#009095',
            secondary: '#1e293b'
        }
    },
    'bapco': {
        id: 'bapco',
        name: 'Bapco Energies',
        logoUrl: 'https://cdn.prod.website-files.com/63a327f073bbfd0ed01684d8/65547143d5790dae980c1969_Bapco_Energies_Logo.png',
        colors: { 
            primary: '#ed1c24',
            secondary: '#2a1010'
        }
    },
    'geco': {
        id: 'geco',
        name: 'GECO',
        logoUrl: 'https://i.ibb.co/Kz9H1HpX/gecologo.png',
        colors: { 
            primary: '#3b82f6',
            secondary: '#1e293b'
        }
    },
    'default': {
        id: 'default',
        name: 'MasarZero',
        logoUrl: 'https://i.ibb.co/Lzf6K7nG/masarzerologo.png',
        colors: { 
            primary: '#14b8a6',
            secondary: '#1e293b'
        }
    }
};

export const applyTheme = (clientId: string): ClientTheme => {
    const config = CLIENT_CONFIGS[clientId] || CLIENT_CONFIGS['default'];
    const root = document.documentElement;
    const hex = config.colors.primary;
    
    // Set CSS Variable for custom usage
    root.style.setProperty('--color-primary', hex);
    
    // Set RGB for Tailwind opacity utilities (e.g. bg-scada-accent/10)
    // We convert Hex to RGB values: "R G B"
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    root.style.setProperty('--color-primary-rgb', `${r} ${g} ${b}`);
    
    return config;
};
