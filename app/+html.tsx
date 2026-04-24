import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const THEME_COLOR = '#E6F4FE';

export default function RootHtml({ children }: PropsWithChildren) {
  const webLayoutReset = `
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    body {
      background-color: ${THEME_COLOR};
      overscroll-behavior: none;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      -webkit-tap-highlight-color: transparent;
    }

    @supports (height: 100dvh) {
      html, body, #root {
        height: 100dvh;
      }
    }
  `;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Jogo da Prevenção</title>
        <meta name="application-name" content="Jogo da Prevenção" />
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <script defer src="/register-sw.js" />
        <style dangerouslySetInnerHTML={{ __html: webLayoutReset }} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
