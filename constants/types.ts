export type ThemeMode = "dark" | "light";

export type ThemeUI = {
    colors: {
        background: string;
        surface: string;
        surfaceSoft: string;
        surfaceDark: string;
        surfaceHover: string;
        surfaceElevated: string;

        text: {
            primary: string;
            secondary: string;
            muted: string;
            accent: string;
            lightAccent: string;
            onAccent: string;
            emphasis: string;
            weak: string;
        };
        switchThumb: {
            dark: string;
            light: string;
        };

        logoText: string;
        primary: string;
        accent: string;
        editButtonbackground: string;

        success: string;
        successSoft: string;
        danger: string;
        dangerSoft: string;

        border: string;
        black: string;

        premium: string;
        premiumSoft: string;

        gold: string;
        goldSoft: string;

        info: string;
        warning: string;

        filterAll: string;
        filterActive: string;
        filterPassive: string;

        overlay: string;
        white: string;  // Add this line

    };

    radius: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
        pill: number;
    };

    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };

    fontSize: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        title: number;
    };

    shadow: {
        soft: {
            shadowColor: string;
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        strong: {
            shadowColor: string;
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
    };
    white: string;
};
