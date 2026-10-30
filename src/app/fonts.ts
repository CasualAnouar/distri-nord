import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

export const inter = Inter({ display: "swap", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter" });
export const plexArabic = IBM_Plex_Sans_Arabic({ display: "swap", preload: false, subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-plex-arabic" });

export const fontVariables = `${inter.variable} ${plexArabic.variable}`;
