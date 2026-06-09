# Prode embebido en gamblor (frontend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embeber Prode como un "juego" dentro del casino gamblor mediante una ruta dedicada `/[locale]/prode` con un iframe y el contrato `postMessage` `prode:*`/`casino:*`.

**Architecture:** Espejo del patrón Sportsbook ya existente en `gamblor-new-ui`. Una ruta server (`page.tsx`) → gate de sesión (`ProdeClient`) → `ProdeFrame` que obtiene un `authorizationCode` reusando `launchGame('prode')`, lo embebe en un iframe, y maneja los eventos del contrato. El backend (externo, `NEXT_PUBLIC_API_URL`) queda fuera de alcance: solo se consume `launchGame`.

**Tech Stack:** Next.js 15 (App Router, Turbopack), next-intl 4 (locales `en/es/pt/fr/it/ru/de`, prefix `always`), React 19, TypeScript, Tailwind 4. **No hay test runner** en el repo — la verificación es `tsc`/`build` + `lint` + smoke manual con el harness `mock-casino.html` de Prode.

**Repo de trabajo:** `d:\Work\gamblor-new-ui`, rama `feat-prode`. Todos los paths del plan son relativos a ese repo salvo que se indique lo contrario.

**Restricción del usuario:** **NO hacer commits.** Los commits los hace el usuario al final. Los pasos "Commit" del formato estándar de la skill se reemplazan por un paso de **verificación** (`tsc`/`lint`).

---

## File Structure

**Nuevos (en `gamblor-new-ui`):**
- `src/lib/prode.ts` — helper `getProdeLaunch()` + `mapLocaleToProde()` (parseo del code + mapeo de locale).
- `src/components/prode/ProdeFrame.tsx` — iframe + listener `postMessage` (núcleo).
- `src/components/prode/ProdeClient.tsx` — gate de sesión, espejo de `SportsbookClient`.
- `src/app/[locale]/prode/page.tsx` — ruta server con `Suspense`.

**Modificados (en `gamblor-new-ui`):**
- `src/components/nav/TopRoutes.tsx` — agregar link "Prode" (nav desktop top).
- `src/components/nav/BottomTab.tsx` — agregar tab "Prode" (nav mobile).
- `src/components/nav/nav-data.ts` — agregar sección "Prode" (sidebar).
- `messages/{en,es,pt,fr,it,ru,de}.json` — claves `ProdePage`, `ProdeFrame`, y entradas `prode` en `TopRoutes`/`bottomTab`.
- `.env.example` — `NEXT_PUBLIC_PRODE_ORIGIN` (crear el archivo si no existe).

---

## Task 1: Helper `lib/prode.ts` (auth code + mapeo de locale)

**Files:**
- Create: `src/lib/prode.ts`

Reusa `launchGame` de `src/lib/games.ts` (firma: `launchGame(identifier, mode, isMobile, locale)` → `Promise<{ game_url: string; game: any }>`).

- [ ] **Step 1: Escribir `src/lib/prode.ts`**

```typescript
// src/lib/prode.ts
import { launchGame } from "@/lib/games";

/** Locales que soporta Prode. Los demás caen a "en". */
const PRODE_LOCALES = new Set(["es", "en", "fr", "de"]);

/**
 * Mapea el locale de gamblor (en/es/pt/fr/it/ru/de) al de Prode (es/en/fr/de).
 * pt/it/ru → "en".
 */
export function mapLocaleToProde(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return PRODE_LOCALES.has(base) ? base : "en";
}

/** Extrae el authorizationCode del query de un game_url. null si no está o la URL es inválida. */
export function extractAuthCode(gameUrl: string): string | null {
  try {
    return new URL(gameUrl).searchParams.get("authorizationCode");
  } catch {
    return null;
  }
}

export interface ProdeLaunch {
  gameUrl: string;
  authorizationCode: string | null;
}

/**
 * Pide al backend (vía launchGame('prode')) un game_url fresco con un
 * authorizationCode de un solo uso embebido en el query.
 */
export async function getProdeLaunch(
  isMobile: boolean,
  locale: string,
): Promise<ProdeLaunch> {
  const { game_url } = await launchGame(
    "prode",
    "real",
    isMobile,
    mapLocaleToProde(locale),
  );
  return { gameUrl: game_url, authorizationCode: extractAuthCode(game_url) };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd d:/Work/gamblor-new-ui && npx tsc --noEmit`
Expected: sin errores relacionados a `src/lib/prode.ts` (puede haber errores preexistentes ajenos; no introducir nuevos).

- [ ] **Step 3: Verificación de lógica (manual, inline)**

Confirmar a ojo, sin runner:
- `mapLocaleToProde("pt") === "en"`, `mapLocaleToProde("es-AR") === "es"`, `mapLocaleToProde("de") === "de"`.
- `extractAuthCode("https://p.com/launch?authorizationCode=ABC") === "ABC"`.
- `extractAuthCode("not-a-url") === null`.

---

## Task 2: `ProdeFrame.tsx` (iframe + listener postMessage)

**Files:**
- Create: `src/components/prode/ProdeFrame.tsx`

Patrón base: `src/components/sportsbook/SportsbookFrame.tsx` (gate `ConnectButton`, skeleton, error con retry) y el iframe de `src/app/[locale]/games/[slug]/page.tsx` (atributos `allow`/`sandbox`). Contrato de eventos: `fl-prode-app/docs/integracion-casino.md` §1.4.

- [ ] **Step 1: Escribir `src/components/prode/ProdeFrame.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { useLocale, useTranslations } from "next-intl";
import { getProdeLaunch, mapLocaleToProde, extractAuthCode } from "@/lib/prode";
import { useUserData } from "@/hooks/useUserData";
import { Logo } from "@/components/ui/Logo";
import ConnectButton from "@/components/auth/ConnectButton";

type Mode = "authenticated" | "anonymous";

const PRODE_ORIGIN = process.env.NEXT_PUBLIC_PRODE_ORIGIN ?? "";

export default function ProdeFrame({ mode }: { mode: Mode }) {
  const t = useTranslations("ProdeFrame");
  const locale = useLocale();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { isConnected } = useUserData();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: game_url con el code embebido (Forma A, cold-start por URL).
  useEffect(() => {
    if (mode !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const { gameUrl } = await getProdeLaunch(isMobile, locale);
        if (!cancelled) setSrc(gameUrl);
      } catch (e) {
        if (!cancelled) setError(t("errors.load"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, isMobile, locale, t]);

  // Listener del contrato prode:* / casino:*
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (!PRODE_ORIGIN || event.origin !== PRODE_ORIGIN) return; // validación de origen
      const { type } = (event.data ?? {}) as { type?: string; payload?: unknown };
      if (!type) return;

      switch (type) {
        case "prode:ready":
          // El code ya viaja en la URL (Forma A); no hace falta responder.
          break;
        case "prode:request-auth": {
          // Re-mintea un code fresco y lo manda sin recargar el iframe.
          try {
            const { gameUrl } = await getProdeLaunch(isMobile, locale);
            const authorizationCode = extractAuthCode(gameUrl);
            if (authorizationCode) {
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "casino:auth",
                  payload: { authorizationCode, locale: mapLocaleToProde(locale) },
                },
                PRODE_ORIGIN, // targetOrigin exacto, nunca '*'
              );
            }
          } catch {
            setError(t("errors.load"));
          }
          break;
        }
        case "prode:resize":
          // no-op (iframe a altura fija en esta versión)
          break;
        case "prode:request-deposit":
          console.warn("[prode] request-deposit (hook no activo):", event.data);
          break;
        case "prode:error":
          setError(t("errors.load"));
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isMobile, locale, t]);

  if (!isConnected && mode === "authenticated") {
    // sesión en transición; el gate real lo hace ProdeClient, pero por las dudas:
    return null;
  }

  if (mode !== "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Logo iconSize={80} />
        <p className="text-center">{t("pleaseLogin")}</p>
        <div className="w-[80%] max-w-xs">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Logo iconSize={50} />
        <div className="bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-2xl text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm underline text-red-400 hover:text-red-300"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 lg:px-8 py-6">
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black">
        {!src ? (
          <div className="h-[80svh] grid place-items-center">
            <p className="text-white/70 text-sm">{t("loading")}</p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={src}
            className="w-full h-[80svh] border-0"
            allow="clipboard-write; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            loading="eager"
            title="Prode"
          />
        )}
      </div>
    </div>
  );
}
```

> **Nota sobre `Logo`:** `SportsbookFrame` importa `import { Logo } from "@/components/ui/Logo";`. Si la ruta real difiere, ajustar el import a la misma que usa `SportsbookFrame.tsx` (verificarlo abriendo ese archivo). Igual con `ConnectButton`.

- [ ] **Step 2: Verificar imports reales**

Run: `cd d:/Work/gamblor-new-ui && npx tsc --noEmit`
Expected: sin nuevos errores de tipos/imports en `ProdeFrame.tsx`. Si `Logo`/`ConnectButton` fallan, copiar la ruta exacta desde `src/components/sportsbook/SportsbookFrame.tsx`.

---

## Task 3: `ProdeClient.tsx` (gate de sesión)

**Files:**
- Create: `src/components/prode/ProdeClient.tsx`

Copia adaptada de `src/app/[locale]/sportsbook/SportsbookClient.tsx`.

- [ ] **Step 1: Escribir `src/components/prode/ProdeClient.tsx`**

```tsx
"use client";

import { useUserData } from "@/hooks/useUserData";
import { useTranslations } from "next-intl";
import ProdeFrame from "@/components/prode/ProdeFrame";

export default function ProdeClient() {
  const t = useTranslations("ProdePage");
  const { user, isLoading } = useUserData();

  if (isLoading) {
    return <div className="p-6 text-white/70">{t("loading")}</div>;
  }

  const mode = user ? "authenticated" : "anonymous";
  return <ProdeFrame key={mode} mode={mode} />;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd d:/Work/gamblor-new-ui && npx tsc --noEmit`
Expected: sin nuevos errores.

---

## Task 4: Ruta `app/[locale]/prode/page.tsx`

**Files:**
- Create: `src/app/[locale]/prode/page.tsx`

Copia de `src/app/[locale]/sportsbook/page.tsx`.

- [ ] **Step 1: Escribir `src/app/[locale]/prode/page.tsx`**

```tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import ProdeClient from "@/components/prode/ProdeClient";

export default async function ProdePage() {
  const t = await getTranslations("ProdePage");

  return (
    <Suspense fallback={<div className="p-6">{t("loading")}</div>}>
      <ProdeClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd d:/Work/gamblor-new-ui && npx tsc --noEmit`
Expected: sin nuevos errores.

---

## Task 5: i18n — claves `ProdePage` y `ProdeFrame`

**Files:**
- Modify: `messages/en.json`, `messages/es.json`, `messages/pt.json`, `messages/fr.json`, `messages/it.json`, `messages/ru.json`, `messages/de.json`

Agregar dos namespaces nuevos (junto a los `Sportsbook*`, ej. después de `SportsbookFrame`). Estructura idéntica en los 7 archivos; solo cambian los textos.

- [ ] **Step 1: `en.json` — agregar tras el bloque `SportsbookFrame`**

```json
  "ProdePage": {
    "loading": "Loading Prode…"
  },

  "ProdeFrame": {
    "loading": "Loading Prode…",
    "pleaseLogin": "Please login to access Prode",
    "retry": "Retry",
    "errors": {
      "load": "Failed to load Prode"
    }
  },
```

- [ ] **Step 2: `es.json`**

```json
  "ProdePage": {
    "loading": "Cargando Prode…"
  },

  "ProdeFrame": {
    "loading": "Cargando Prode…",
    "pleaseLogin": "Iniciá sesión para acceder a Prode",
    "retry": "Reintentar",
    "errors": {
      "load": "No se pudo cargar Prode"
    }
  },
```

- [ ] **Step 3: `pt.json`**

```json
  "ProdePage": {
    "loading": "Carregando Prode…"
  },

  "ProdeFrame": {
    "loading": "Carregando Prode…",
    "pleaseLogin": "Faça login para acessar o Prode",
    "retry": "Tentar novamente",
    "errors": {
      "load": "Falha ao carregar o Prode"
    }
  },
```

- [ ] **Step 4: `fr.json`**

```json
  "ProdePage": {
    "loading": "Chargement de Prode…"
  },

  "ProdeFrame": {
    "loading": "Chargement de Prode…",
    "pleaseLogin": "Connectez-vous pour accéder à Prode",
    "retry": "Réessayer",
    "errors": {
      "load": "Échec du chargement de Prode"
    }
  },
```

- [ ] **Step 5: `it.json`**

```json
  "ProdePage": {
    "loading": "Caricamento di Prode…"
  },

  "ProdeFrame": {
    "loading": "Caricamento di Prode…",
    "pleaseLogin": "Accedi per usare Prode",
    "retry": "Riprova",
    "errors": {
      "load": "Impossibile caricare Prode"
    }
  },
```

- [ ] **Step 6: `ru.json`**

```json
  "ProdePage": {
    "loading": "Загрузка Prode…"
  },

  "ProdeFrame": {
    "loading": "Загрузка Prode…",
    "pleaseLogin": "Войдите, чтобы открыть Prode",
    "retry": "Повторить",
    "errors": {
      "load": "Не удалось загрузить Prode"
    }
  },
```

- [ ] **Step 7: `de.json`**

```json
  "ProdePage": {
    "loading": "Prode wird geladen…"
  },

  "ProdeFrame": {
    "loading": "Prode wird geladen…",
    "pleaseLogin": "Melde dich an, um Prode zu nutzen",
    "retry": "Erneut versuchen",
    "errors": {
      "load": "Prode konnte nicht geladen werden"
    }
  },
```

- [ ] **Step 8: Validar JSON de los 7 archivos**

Run: `cd d:/Work/gamblor-new-ui && node -e "['en','es','pt','fr','it','ru','de'].forEach(l=>{JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8'));console.log(l,'ok')})"`
Expected: `en ok`, `es ok`, … (los 7). Si alguno tira `SyntaxError`, hay una coma mal puesta.

---

## Task 6: Nav — link "Prode" en TopRoutes, BottomTab y sidebar

**Files:**
- Modify: `src/components/nav/TopRoutes.tsx`
- Modify: `src/components/nav/BottomTab.tsx`
- Modify: `src/components/nav/nav-data.ts`
- Modify: `messages/{en,es,pt,fr,it,ru,de}.json` (claves de label en `TopRoutes` y `bottomTab`)

Ícono: reusar `/menu/f-f.png` (ya existe en `public/menu/`). El sidebar usa svg-icons; reusar `/svg-icons/Vector (3).svg` (el del sportsbook) o el que corresponda.

- [ ] **Step 1: `TopRoutes.tsx` — agregar entrada al array `LINKS`**

Agregar tras la entrada `sportsbook` (antes de `offers`):

```tsx
  {
    href: "/prode",
    labelKey: "prode",
    icon: "/menu/f-f.png",
  },
```

Y en el `useMemo` de `activeKey`, agregar antes del `return ""`:

```tsx
    if (lastSegment === "prode") return "prode";
```

- [ ] **Step 2: `BottomTab.tsx` — agregar entrada al array `TABS`**

**Decisión del usuario: conservar Chat, pasar a `grid-cols-6`.** Cambiar `grid-cols-5` → `grid-cols-6` en el `<ul>` (línea ~121) y agregar `prode` como sexta entrada en el array `TABS` (tras `sports`, antes de `chat`):

```tsx
  { key: "prode", href: "/prode", image: "/svg-icons/Vector (3).svg" },
```

- [ ] **Step 3: `nav-data.ts` — agregar sección Prode**

Reemplazar el bloque comentado "Fantasy Football" (líneas ~82-85) por una sección activa:

```ts
  {
    label: "Prode",
    href: "/prode",
    imgIconSrc: "/svg-icons/Vector (3).svg",
  },
```

(El `label` del sidebar es texto literal en este archivo, no clave i18n — seguir el patrón existente del archivo, que usa strings directos como "Sportsbook".)

- [ ] **Step 4: i18n labels — agregar `prode` a `TopRoutes` y `bottomTab` en los 7 messages**

En cada `messages/{locale}.json`, dentro del namespace `TopRoutes` agregar `"prode": "<texto>"` y dentro de `bottomTab` agregar `"prode": "<texto>"`.

Textos por locale (mismo para ambos namespaces, "Prode" es nombre propio salvo donde quieras traducir):
- en/es/pt/fr/it/de/ru: `"Prode"` (nombre de marca; se deja igual en todos).

Ejemplo en `en.json`:
```json
  "TopRoutes": {
    "casino": "Casino",
    "liveCasino": "Live Casino",
    "sportsbook": "Sportsbook",
    "prode": "Prode",
    "offers": "Offers"
  },

  "bottomTab": {
    "menu": "Menu",
    "search": "Search",
    "casino": "Casino",
    "sports": "Sports",
    "prode": "Prode",
    "chat": "Chat"
  },
```

Repetir la adición de `"prode": "Prode"` en `TopRoutes` y `bottomTab` de los otros 6 archivos.

- [ ] **Step 5: Validar JSON + tipos**

Run: `cd d:/Work/gamblor-new-ui && node -e "['en','es','pt','fr','it','ru','de'].forEach(l=>{JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8'));console.log(l,'ok')})" && npx tsc --noEmit`
Expected: los 7 `ok` y sin nuevos errores de tipos.

---

## Task 7: Env — `NEXT_PUBLIC_PRODE_ORIGIN`

**Files:**
- Modify/Create: `.env.example` (y `.env.local` del usuario, que NO se commitea)

- [ ] **Step 1: Agregar a `.env.example`**

Si existe `.env.example`, agregar la línea; si no, crearlo con esta línea (más cualquier otra var pública ya usada — al menos `NEXT_PUBLIC_API_URL` que el repo ya consume):

```
# Origen del iframe de Prode (para validar postMessage). Sin barra final.
NEXT_PUBLIC_PRODE_ORIGIN=https://prode.tudominio.com
```

- [ ] **Step 2: Indicar al usuario que setee la var real**

Dejar nota en el resumen final: el usuario debe poner `NEXT_PUBLIC_PRODE_ORIGIN` en su `.env.local` apuntando al deploy real de Prode (ej. la URL de Vercel), y agregar el origen de gamblor a `NEXT_PUBLIC_PARENT_ORIGINS` en el deploy de Prode.

---

## Task 8: Verificación final (build + lint + smoke)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Type-check completo**

Run: `cd d:/Work/gamblor-new-ui && npx tsc --noEmit`
Expected: sin nuevos errores introducidos por estos cambios.

- [ ] **Step 2: Lint**

Run: `cd d:/Work/gamblor-new-ui && npm run lint`
Expected: sin nuevos errores/warnings en los archivos creados/modificados.

- [ ] **Step 3: Build**

Run: `cd d:/Work/gamblor-new-ui && npm run build`
Expected: build exitoso; la ruta `/[locale]/prode` aparece en el output de rutas.

- [ ] **Step 4: Smoke manual (documentar, no ejecutar automáticamente)**

Instrucciones para el usuario:
1. Setear `NEXT_PUBLIC_PRODE_ORIGIN` y `NEXT_PUBLIC_API_URL` en `.env.local`.
2. `npm run dev`, navegar a `/<locale>/prode`.
3. Sin backend que conozca `prode` en `/games/launch`, se verá el estado de error de carga — **esperado**. El contrato `postMessage` se valida aparte con el harness `mock-casino.html` de Prode (ver `fl-prode-app/docs/integracion-casino.md` §4).

- [ ] **Step 5: NO commitear**

Recordatorio: los commits los hace el usuario. No ejecutar `git commit`.

---

## Notas de integración cruzada (para el resumen final al usuario)

- **Deploy de Prode:** agregar el origen de gamblor a `NEXT_PUBLIC_PARENT_ORIGINS` (CSP `frame-ancestors` + allowlist postMessage), o el iframe no carga.
- **Backend de gamblor (fuera de alcance, otro repo):** debe (1) cablear `identifier='prode'` en `/games/launch` devolviendo `game_url = <PRODE_ORIGIN>/launch?authorizationCode=<code>&locale=<x>`; (2) exponer `POST /providers/prode/authenticate` y `POST /providers/prode/moveFunds` según `docs/integracion-casino.md` §2.
- **Decisión pendiente del usuario:** en `BottomTab`, ¿reemplazar `chat` por `prode` (grid-cols-5) o conservar ambos (grid-cols-6)?
```
