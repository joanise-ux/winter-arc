# Winter Arc

Instalowalna aplikacja (PWA) do 90-dniowego wyzwania: zadania dzienne, wyzwania tygodniowe, liczniki (woda, białko, kroki, sen), log treningów oraz podsumowania tygodnia i miesiąca. Dane są zapisywane tylko na urządzeniu.

```bash
npm install
npm run dev      # podgląd lokalny
npm test         # testy logiki dat i statystyk
npm run build    # wersja produkcyjna w dist/
```

Wdrożenie: push na `main` uruchamia `.github/workflows/deploy.yml`, który publikuje `dist/` na GitHub Pages (w repozytorium: Settings → Pages → Source: GitHub Actions).
