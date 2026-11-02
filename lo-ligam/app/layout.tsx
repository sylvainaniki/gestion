import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Lo Ligam · Ensemble, faisons vivre l’école',description:'L’espace partagé des commissions : événements, missions et communication bilingue.',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Lo Ligam',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
