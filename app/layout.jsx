import "./globals.css";
import { Providers } from "../components/Providers";
import { Footer, Header } from "../components/Header";
import ConsentBanner from "../components/ConsentBanner";

export const metadata = {
  title: { default: "Decouse — Find your own fashion", template: "%s · Decouse" },
  description: "Thoughtful clothing and accessories, chosen to feel like you. Discover the Decouse collection for women, men and kids.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><Providers><a className="skip-link" href="#main-content">Skip to content</a><Header/><main id="main-content" tabIndex={-1}>{children}</main><Footer/><ConsentBanner/></Providers></body></html>;
}
