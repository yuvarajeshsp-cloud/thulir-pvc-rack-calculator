# Thulir PVC Rack Calculator

Interactive microgreen rack planner with realistic 3D views, vertical and stepped racks, PVC pipe cutting plans and customer estimates. This repository holds the canonical buildless web app (`dist/`), a generated mobile web copy (`www/`) and the Capacitor Android/iOS project that bundles it for offline use.

## Run in a browser

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No build step is required. Pushes to `main` publish `www/` to GitHub Pages at https://yuvarajeshsp-cloud.github.io/thulir-pvc-rack-calculator/ (see `.github/workflows/pages.yml`). `netlify.toml` lets Netlify deploy the same folder: import the repository in Netlify and it picks up the settings. `www/` also works on any other static web host; `www/mobile.js` only activates inside the native app.

Settings and customer details are stored in your browser, not synced between devices. Prices are editable budget references. Verify physical fitting dimensions before construction; effects are illustrative.

## Mobile app

Android and iOS source project, with the rack calculator bundled for offline use. Includes powered LED crop illumination, animated 120 mm fans and airflow, independent power switches, fitting inspection, cutting optimisation, prices and customer estimates.

### Build

Use Node 22 or newer. From the repository root:

```sh
npm ci
npm run sync
npm run android
# On a Mac:
npm run ios
```

Android: install Android Studio (2025.2.1 or newer), SDK 36 and its supported JDK (21). Let Gradle sync, choose a device/emulator and Run. Build > Generate Signed App Bundle / APK produces a distributable after configuring your signing key. The included Gradle wrapper can also run `./gradlew assembleDebug` from `android/` once the SDK/JDK are configured. Android minimum API 24.

iOS: requires macOS, Xcode and an Apple signing team for device distribution. Open the generated project using `npm run ios`, select your team, and Run or Archive. Swift Package Manager resolves the native dependencies.

The package identifier is `com.thulir.rackcalculator`; confirm ownership/choose your final identifier before store distribution. Default Capacitor launcher/splash artwork is included; replace it with final brand artwork before store release.

### Features and native behaviour

- Bundled local assets; no hosted-site login or network needed to configure a rack.
- Prices/configuration persist in this installation's WebView storage. Website browser data does not automatically move into the app; enter existing custom prices again. Uninstalling/clearing app data removes local data.
- Add fans/lights to install them in the plan. Their separate power switches affect only the visual preview; the bill and estimate retain installed equipment.
- Light/airflow visuals are illustrative, not lux, PPFD or airflow calculations. Effects respect reduced-motion preferences; fans remain visibly represented.
- Cut lists use the native share sheet as CSV. Build lists and customer estimates share as standalone printable HTML (not PDF). Open shared HTML in a browser to print/save as PDF.
- Supplier links open the native in-app browser.
- Android Back closes inspection/fullscreen first, then returns to Configure, then minimises the app.
- Safe-area padding and existing touch controls are retained.
- Core calculations do not send customer data to a server. Sharing a document sends it only to the destination the user selects.

### Editing

`dist/` is the canonical app source. Run `npm run sync:web` to refresh `www/`, which adds the native bridge. `npm test` runs the shared calculation and estimate rendering tests; `src/mobile.js` implements native sharing, external links and Android Back. `npm run sync` bundles the bridge and copies web assets into both native projects. Keep the generated projects in source control. No production website changes are automatically pulled into this package.

### Validation performed

- JavaScript syntax and mobile bridge bundle completed.
- Capacitor Android/iOS projects created and synced with all four plugins.
- Mocked WebGL geometry checks passed for all four views and on/off/step configurations; all generated vertices finite.
- Equipment bill remains identical when only power state changes.

No emulator, device or native compiler validation was available in the build environment (Android SDK absent; no macOS/Xcode). This is a source package, not an APK/IPA. Verify visual effects, share sheets, safe areas and background/resume on a real device before distributing.

Official references:
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/apis/share
- https://capacitorjs.com/docs/apis/filesystem
- https://capacitorjs.com/docs/apis/app


## Pricing update · 21 October 2026



- Set base prices, profit markup and installation per rack in Price Configuration.
- Customer selling unit price = base price × (1 + markup / 100), rounded to paise.
- Rack quantity defaults to 1; valid range is 1–999 whole racks.
- Components and installation scale with rack quantity. Additional costs apply once across the entire estimate, without component markup.
- Discount applies to components + installation + additional costs; tax applies after discount.
- Printed estimates use the same shared calculation as the screen.
- Existing browser settings use the same storage keys. Migration removes obsolete 3 m / 9.84 ft stock-price entries while preserving 20 ft prices and other settings.

Example: 4 components × 3 racks × ₹120 selling price = ₹1,440; ₹500 installation × 3 = ₹1,500; total ₹2,940 before extras, discount and tax.

Realistic 3D rendering, dark background, vertical/stepped layouts, cutting plans, connector images, fans, LEDs, irrigation, independent power controls and fullscreen remain included.

## Validation

11 automated calculation, migration, rendering/printing and plan regression tests pass. Browser checks confirm the ₹2,940 example, estimate-wide delivery, persisted pricing and responsive rows at 390 px. Native print/PDF dialog output was not visually verified in this environment; generated print HTML and totals are tested.
