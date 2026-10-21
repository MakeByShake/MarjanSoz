import type { Metadata, Viewport } from "next";
import { BusyIndicator } from "@/components/BusyIndicator";
import { Lora, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

// cyrillic-ext содержит казахские буквы ә ғ қ ң ө ұ ү һ і
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

// Заголовки и мақалдар: Lora — книжная антиква с живым курсивом
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  style: ["normal", "italic"],
});

// Тек логотип жазуы үшін («MarjanSóz» — латын әріптері)
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "700",
});

export const metadata: Metadata = {
  title: { default: "MarjanSóz", template: "%s - MarjanSóz" },
  description: "Қазақ мақал-мәтелдерін үйрену платформасы",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#121a19" },
  ],
};

// Ставит сохранённую тему до первой отрисовки, чтобы не было вспышки
const themeScript = `(function(){try{var t=localStorage.getItem("marjansoz_theme");if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="kk"
      data-theme="light"
      suppressHydrationWarning
      className={`${notoSans.variable} ${lora.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <BusyIndicator />
      </body>
    </html>
  );
}
