# Nocturne iPhone build kit

The bundled `www/` contains the same private observation app, star catalog, planetary calculations and Chilbolton transcription as the web edition. It is self-contained and does not require the private Sites login when installed natively. Observations stay in the app's local WebView storage.

## What is ready

- Production web bundle and all offline astronomy assets.
- Capacitor 8 configuration and iOS permission descriptions.
- A manually triggered macOS cloud workflow to compile an unsigned simulator app.

## Build from Windows/Linux through a Mac runner

1. Put the contents of this directory in a private GitHub repository. The workflow is in `.github/workflows/ios-build.yml`.
2. Run the workflow from Actions. It installs the pinned Capacitor dependencies and creates an iOS project on the macOS runner. It requires Xcode 26 or newer; select a suitable runner/Xcode installation if the runner default differs.
3. The workflow produces a **simulator build**, not an installable signed iPhone IPA. No Apple account, signing identity, certificate or provisioning profile was supplied or embedded.
4. For your physical iPhone, use an Apple Developer signing identity and an App Store Connect/TestFlight or development provisioning workflow on a Mac/cloud service. Use the generated `ios/App/App.xcodeproj`, scheme `App`, bundle identifier `com.paddyjay.nocturne`, and your own Apple team. Never put signing secrets in this repository.
5. Test the physical phone capabilities below before treating it as a field-ready native release.

On a Mac with Node 22+, Xcode 26+, and the relevant build tools: `npm ci`, `npm run ios:add`, then `npm run ios:open`.

## Physical-device acceptance checks

- Camera permission grant/deny/retry and rear lens selection.
- Portrait camera crop and AR calibration against at least two known stars; rotate the device and recheck.
- Motion/heading permission and magnetic interference; displayed uncertainty is not a certified error bound.
- Simultaneous video plus generated audio, clip save, background interruption and share/export.
- Torch capability, actual timing, thermal behavior and automatic off on Stop All. This wrapper still uses capability-detected WebView torch control; it is not a calibrated native light driver.
- Offline relaunch; storage quota behavior; five-minute clip cap.
- Imported audio playback and local file export in WKWebView. Browser download behavior can differ on-device.

The macOS/Xcode workflow and physical iPhone operation have not been executed in the Linux authoring environment. Do not call the kit a signed or device-verified release. The browser edition is the directly usable delivery.

## Scientific boundaries

qCode's exact published waveform remains unavailable. The mode imports user-documented sequences; it is not an invented authentic qCode. CE5-inspired timing is app-defined. Chilbolton is a published image reconstruction. No verified summoning frequency or tunable optical wavelength is claimed.

References: https://capacitorjs.com/docs/ios and https://capacitorjs.com/docs/updating/8-0
