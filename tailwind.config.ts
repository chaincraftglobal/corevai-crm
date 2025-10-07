import type { Config } from "tailwindcss";

export default {
    darkMode: "class",                 // ✅ was ["class"], now just "class"
    theme: { extend: {} },
    plugins: [],
} satisfies Config;