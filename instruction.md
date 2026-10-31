# Projektanweisung: Spotilyric (Vencord Plugin)

> **An den ausführenden Entwickler-Agenten:**
> Dieses Dokument ist deine verbindliche Spezifikation.
> Arbeite die Roadmap strikt Phase für Phase ab.
> Führe nach jedem Schritt die Verifikations-Befehle aus. Weiche nicht eigenmächtig von Stack oder Architektur ab.

---

## 1. Projektübersicht & Scope

- **Problem & Ziel:**
  Viele Musikliebhaber möchten ihren aktuellen Spotify-Songtext in Echtzeit im Discord-Status teilen. Bisherige Lösungen erfordern entweder externe Node.js-/Python-/Java-Bots, riskante User-Token-Dateien (Self-Bot Ban-Gefahr) oder kostenpflichtige Spotify-Premium-Konten.
  **Spotilyric** löst dieses Problem elegant als **natives Vencord-Plugin (UserPlugin)** direkt in Discord: Es liest die native Spotify-Wiedergabe aus Discords internem Spotify-Store aus, ruft sekundengenaue Songtexte von der kostenlosen, quelloffenen **LRCLIB API** ab und synchronisiert den Discord Custom Status in Echtzeit im Format `Song - [Aktuelle Zeile]`. Wenn die Wiedergabe stoppt, wird der vorherige Status automatisch wiederhergestellt.

- **In-Scope (MVP):**
  - **Vencord UserPlugin (`definePlugin`):** 100% nativ in Discord/Vencord/Equicord/Vesktop lauffähig, ohne externe Programme oder Bots.
  - **Echtzeit-Spotify-Tracking:** Liest Track, Artist, Album und Millisekunden-Fortschritt direkt aus Discords internem `SpotifyStore` (funktioniert mit Spotify Free & Premium).
  - **LRCLIB-Integration:** Automatischer Abruf synchronisierter Songtexte (`syncedLyrics`) via `https://lrclib.net/api/get` mit lokalem In-Memory-Cache pro Song-ID.
  - **Robuster LRC-Parser:** Präzises Parsen von Zeitstempeln (`[mm:ss.xx]`) in Millisekunden und binäre Suche nach der jeweils aktiven Textzeile.
  - **Discord Custom Status Synchronisation:** Aktualisiert Discords Custom Status über `UserSettingsProtoUtils.updateCustomStatus` mit Format `Song - Zeile` und konfigurierbarem Emoji (Standard: `🎵`).
  - **Status-Wiederherstellung (State Backup & Restore):** Merkt sich den vorherigen Status des Nutzers vor Beginn der Musik und stellt ihn bei Pause/Stopp/Track-Ende nahtlos wieder her.
  - **Fallback-Handling:** Falls LRCLIB keine synchronisierten Texte für einen Song hat (z. B. Instrumentals), wird sauber `🎵 Song - Artist` angezeigt.
  - **Rate-Limit & Anti-Spam Guard:** Verhindert API-Spam bei schnellen Songtext-Passagen durch Drosselung (Mindestabstand zwischen Status-Aktualisierungen) und Aktualisierung nur bei tatsächlicher Textänderung.
  - **Vencord Einstellungsmenü (Settings UI):** Toggles für Wiederherstellung, Fallback-Modus, Status-Format und Emoji.

- **Out-of-Scope (Ausdrücklich verboten / Nicht implementieren):**
  - ❌ **Keine externen User-Tokens / Discord Bot APIs:** Keine Eingabe von privaten Discord-User-Tokens; alles läuft clientseitig über Vencords interne Discord-Stores.
  - ❌ **Kein Spotify Developer API Client-Secret Zwang:** Kein Zwang zu Spotify-Developer-Apps oder OAuth-Servern; es wird primär Discords eingebaute Spotify-Verbindung genutzt.
  - ❌ **Keine kostenpflichtigen APIs:** Ausschließlich die freie LRCLIB API.
  - ❌ **Kein Java / Node-Hintergrund-Daemon:** Das Tool wird als Vencord-Plugin betrieben, nicht als Standalone-Java-Prozess.

---

## 2. Tech-Stack & Feste Leitplanken

- **Runtime & Plattform:** Discord Desktop Client mit Vencord / Equicord / Vesktop (Web / Electron / React 19 / Modern Web APIs).
- **Sprache & Standards:** TypeScript 5.x mit `strict: true` und modernem ECMAScript (ESM, keine CommonJS `require()`).
- **Plugin-Framework:** Vencord Plugin API (`definePlugin`, `definePluginSettings`, Vencord Webpack Stores).
- **Core-Dependencies:**
  - `@vencord/types` / Vencord Webpack API (`@webpack`, `@webpack/common`).
  - React für die Einstellungen (Plugin Settings UI).
  - Vitest für schnelle, isolierte Unit-Tests des LRC-Parsers und State-Managers.
- **Paketmanager & Build:** `pnpm` (oder `npm`), TypeScript Compiler (`tsc`).

### Verbotene Muster & Fallstricke (Anti-Halluzinations-Regeln)
- ❌ **Kein `require()` oder `module.exports`** – Ausschließlich ESM (`import` / `export`).
- ❌ **Kein ungedrosselter Status-Loop** – Niemals in einem schnellen `setInterval(50ms)` ungefiltert `updateCustomStatus` aufrufen. Discord hat serverseitige Rate-Limits für Status-Updates!
- ❌ **Kein Zerstören von Nutzer-Status** – Niemals den Status leeren, ohne vorher den ursprünglichen Status gesichert zu haben (`CustomStatusStore`).
- ❌ **Keine ungetypten `any`-Wüsten** – Alle Song-Metadaten, LRC-Zeilen und Plugin-Settings müssen streng typisiert sein.
- ❌ **Keine harten Netzwerkabstürze** – Alle `fetch`-Aufrufe zu LRCLIB müssen mit `try/catch` und Timeouts (AbortController) abgesichert sein.

---

## 3. Architektur & Dateistruktur

```text
spotilyric/
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md                      # Englische Dokumentation & Installationsanleitung für Vencord
├── instruction.md                 # Diese verbindliche Spezifikation
├── src/
│   ├── index.tsx                  # Vencord Plugin Entry Point (definePlugin, start/stop Lifecycle)
│   ├── settings.tsx               # Plugin Settings Panel & Konfigurations-Definition
│   ├── types.ts                   # TypeScript Interfaces (Song, LyricLine, PluginSettings)
│   ├── lrclib.ts                  # LRCLIB API Client mit Caching & Error-Handling
│   ├── parser.ts                  # LRC Synchronized Text Parser & Timestamp-Matcher
│   ├── spotify.ts                 # Schnittstelle zu Discords SpotifyStore & Track-Erkennung
│   └── statusManager.ts           # Status Updater mit Backup/Restore & Rate-Limit Guard
└── tests/
    ├── parser.test.ts             # Unit-Tests für den LRC-Parser und Zeitstempel-Matching
    └── lrclib.test.ts             # Tests für URL-Building und Fallback-Verhalten
```

---

## 4. Datenmodell & Schemas (Streng typisiert)

```typescript
// src/types.ts

export interface LyricLine {
  /** Zeitstempel der Zeile in Millisekunden */
  timeMs: number;
  /** Der Text dieser Songtextzeile */
  text: string;
}

export interface SyncedLyrics {
  trackName: string;
  artistName: string;
  durationMs: number;
  /** Sortierte Liste aller synchronisierten Zeilen nach timeMs aufsteigend */
  lines: LyricLine[];
  /** Gibt an, ob synchronisierte Texte verfügbar sind */
  isSynced: boolean;
}

export interface SpotifyTrackInfo {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  durationMs: number;
  /** Millisekunden seit Trackstart zum Zeitpunkt des Auslesens */
  progressMs: number;
  isPlaying: boolean;
  timestamps: {
    start: number;
    end?: number;
  };
}

export interface PreviousUserStatus {
  text: string | null;
  emojiName: string | null;
  emojiId: string | null;
}

export interface SpotilyricSettings {
  /** Vorherigen Status wiederherstellen nach Musik-Ende */
  restorePreviousStatus: boolean;
  /** Fallback: Songtitel + Artist anzeigen wenn keine Lyrics verfügbar sind */
  fallbackToTrackInfo: boolean;
  /** Format: 'title_lyric' (Song - Zeile) oder 'lyric_only' (nur Zeile) */
  displayFormat: "title_lyric" | "lyric_only";
  /** Standard Emoji für den Status (z. B. "🎵") */
  statusEmoji: string;
  /** Mindestintervall zwischen zwei Status-Updates in ms gegen Rate-Limits (Default: 2000) */
  minUpdateIntervalMs: number;
}
```

---

## 5. Detaillierte Features mit "Definition of Done" (DoD)

### Feature 1: LRC-Parser & Timestamp-Matching (`src/parser.ts`)
- **Beschreibung:** Wandelt Roh-LRC-Strings wie `[01:23.45] Hello World` in typisierte `LyricLine[]` um und findet für jede Millisekunde `currentMs` die aktuell gültige Zeile.
- **Definition of Done (Akzeptanztest):**
  - *Eingabe:* LRC-String mit mehreren Zeilen und `currentMs = 84000`.
  - *Erwartetes Ergebnis:* Die exakt aktive Zeile wird zurückgegeben; Zeilen vor dem ersten Timestamp liefern `null` oder Leerzeile.
  - *Zustandsänderung:* Keine Nebeneffekte, 100% reine Funktionen mit Unit-Tests abgedeckt.

### Feature 2: LRCLIB API Client & Cache (`src/lrclib.ts`)
- **Beschreibung:** Fragt `https://lrclib.net/api/get` mit `track_name`, `artist_name`, `album_name` und `duration` ab.
- **Definition of Done (Akzeptanztest):**
  - *Eingabe:* Abruf für einen Track.
  - *Erwartetes Ergebnis:* Gibt `SyncedLyrics` zurück. Bei wiederholtem Aufruf für denselben Song greift der In-Memory-Cache ohne erneuten HTTP-Request. Bei 404/Netzwerkfehler wird `null` zurückgegeben ohne Exception.

### Feature 3: Spotify-Erkennung via Discord-Store (`src/spotify.ts`)
- **Beschreibung:** Liest aus Vencords Webpack-Modulen (`SpotifyStore`) den aktuellen Track und berechnet die exakte Wiedergabeposition: `Date.now() - activity.timestamps.start`.
- **Definition of Done (Akzeptanztest):**
  - *Erwartetes Ergebnis:* Liefert präzise `SpotifyTrackInfo` oder `null`, falls Spotify nicht läuft / pausiert ist.

### Feature 4: Status Manager mit Backup & Restore (`src/statusManager.ts`)
- **Beschreibung:** Überwacht den aktuellen Discord-Status. Sichert vor dem ersten Lyric-Update den bestehenden Status des Nutzers (`backupPreviousStatus`). Sobald Spotify stoppt oder pausiert, wird der gesicherte Status via `restorePreviousStatus` wiederhergestellt.
- **Definition of Done (Akzeptanztest):**
  - *Eingabe:* Song startet -> Status wechselt zu `🎵 Song - Zeile`.
  - *Eingabe:* Spotify wird pausiert oder geschlossen.
  - *Erwartetes Ergebnis:* Discord-Status wird exakt auf den Zustand vor dem Musikstart zurückgesetzt.

### Feature 5: Anti-Spam & Rate-Limit Guard
- **Beschreibung:** Discord erlaubt nicht beliebig viele Status-Updates pro Sekunde. Der Manager aktualisiert den Status nur, wenn:
  1. Der Text sich tatsächlich von der vorherigen Zeile unterscheidet.
  2. Mindestens `minUpdateIntervalMs` (z. B. 2000 ms) vergangen sind (oder ein intelligenter Timer auf den nächsten Zeilen-Zeitstempel wartet).
- **Definition of Done (Akzeptanztest):**
  - Keine Discord API Error 429 (Too Many Requests), saubere flüssige Wechsel.

---

## 6. Fehlermatrix & Edge Cases

| Situation / Ausnahme | Systemverhalten | Feedback an Nutzer |
| :--- | :--- | :--- |
| Song hat keine Lyrics auf LRCLIB | Fallback greift: Zeigt `🎵 [Song] - [Artist]` an (wenn in Settings aktiv) | Status bleibt dezent und informativ |
| Spotify pausiert / Track wechselt | Timer stoppt; vorheriger Status wird wiederhergestellt | Nahtlose Wiederherstellung |
| LRCLIB offline oder Rate-Limited | Fehler wird geloggt, kein Plugin-Crash, Fallback aktiv | Stille Fortführung ohne Störung |
| Schneller Songtext (< 1.5s pro Zeile) | Rate-Limit Guard überspringt Zwischenzeilen und springt zur nächsten passenden Zeile | Kein 429-Bann von Discord |
| Nutzer ändert manuell seinen Status während Song läuft | Neuer manueller Status wird als neues Backup registriert | Nutzerkontrolle bleibt gewahrt |

---

## 7. Phasenweise Implementierungs-Roadmap

### Phase 1: Projekt-Setup & TypeScript-Konfiguration
- [ ] Initialisierung von `package.json`, `tsconfig.json` und `.gitignore`.
- [ ] Einrichtung von Vitest für Unit-Tests.
- [ ] **Verifikation:** `pnpm test` bzw. `npm test` führt die Testumgebung fehlerfrei aus.

### Phase 2: Typen & Core LRC-Parser
- [ ] `src/types.ts` mit allen Datenstrukturen anlegen.
- [ ] `src/parser.ts` mit Parsing von LRC-Tags `[mm:ss.xx]` und binärem Zeitstempel-Matching.
- [ ] Unit-Tests in `tests/parser.test.ts` implementieren.
- [ ] **Verifikation:** 100% aller Parser-Tests bestehen fehlerfrei.

### Phase 3: LRCLIB API Client mit Caching
- [ ] `src/lrclib.ts` implementieren (Abruf, In-Memory-Cache per `trackId` oder `artist-title`).
- [ ] Fehler- und Fallback-Handling (Instrumental, keine synchronisierten Texte).
- [ ] **Verifikation:** Unit-Tests für Cache und Fallback bestehen.

### Phase 4: Spotify-Anbindung & Status-Manager (Backup/Restore)
- [ ] `src/spotify.ts`: Anbindung an Discords `SpotifyStore`.
- [ ] `src/statusManager.ts`: State Backup, Throttling & `updateCustomStatus`.
- [ ] **Verifikation:** Simulierter Status-Lebenszyklus (Start -> Zeile 1 -> Zeile 2 -> Pause -> Restore) verifiziert.

### Phase 5: Vencord-Plugin-Integration & Settings-UI
- [ ] `src/index.tsx`: Vencord `definePlugin` mit `start()`, `stop()` und Event-Listeners.
- [ ] `src/settings.tsx`: Vencord Plugin Settings Panel (Restore Toggle, Fallback Toggle, Format Picker, Emoji).
- [ ] `README.md` mit klarer Anleitung für Vencord, Equicord und Vesktop.
- [ ] **Verifikation:** Vollständiger TypeScript-Check (`npx tsc --noEmit`) ohne Fehler.

---

## 8. Start- und Testbefehle
- Abhängigkeiten installieren: `npm install` oder `pnpm install`
- Tests ausführen: `npm test`
- TypeScript Typ-Check: `npm run typecheck` (oder `npx tsc --noEmit`)
- Build / Bundle: `npm run build`
