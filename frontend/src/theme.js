import { createTheme } from '@mui/material/styles';


// Dull yellow = primary, Bright green = secondary
const theme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: '#0a0a0a', paper: '#1e1d1d' },
        text: {
            primary: '#998d8d',
            secondary: 'rgb(198, 198, 198)'
        },
        primary: { main: '#c2a800', contrastText: '#0a0a0a' },
        secondary: { main: '#00e676', contrastText: '#0a0a0a' },
        success: { main: '#00e676' }
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: `
::selection { background: #c2a800; color: #0a0a0a; }
a { color: #00e676; }
`
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'rgba(255,255,255,0.12)'
                }
            },
            variants: [
                {
                    props: { variant: 'elevated' },
                    style: { backgroundColor: '#ffffff', color: '#111111', borderColor: '#e6e6e6' }
                },
                {
                    props: { variant: 'outlined' },
                    style: { backgroundColor: '#0f0f0f', color: '#ffffff', borderColor: '#222' }
                }
            ]
        },
        MuiButton: {
            styleOverrides: { root: { borderRadius: 12, textTransform: 'none', fontWeight: 700 } }
        },
        MuiTextField: { styleOverrides: { root: { borderRadius: 12 } } },
        MuiChip: { styleOverrides: { root: { fontWeight: 700 } } }
    },
    typography: {
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        h4: { fontWeight: 800 },
        h6: { fontWeight: 700 }
    }
});


export default theme;