# Mobile acceptance specification (SwiftUI, Compose, Flutter)

Reviewed operator specification for the `protoflow-mobile-20261013` prototype stream. It applies to every version of the stream on every target.

- The prototype is the design input. Each prototype page is one screen (`<body data-pf="<screen>" data-pf-role="screen">`); every `data-pf` anchor must exist in the application with the identical ID, the same text, order and visibility, and styling that follows `prototype/tokens.json` and the prototype CSS. States in `<page>.pf.json` sidecars must be reachable with the listed steps.
- Screens are opened directly by the launch convention: `PROTOFLOW_SCREEN` (iOS launch argument read through `UserDefaults`, Android string intent extra, Flutter through the `dev.protoflow/launch` method channel). A new prototype screen must be openable this way, with the screen id as the value.
- iOS target (`ios/`, SwiftUI): anchors are `.accessibilityIdentifier("<id>")`; screens and regions add `.accessibilityElement(children: .contain)`. The screen root fills the safe area. Functional tests live in `ios/ProtoFlowTasksUITests` (XCUITest).
- Android target (`android/`, Jetpack Compose): anchors are `Modifier.testTag("<id>")` with `Modifier.semantics { testTagsAsResourceId = true }` on each screen root. The screen root fills the safe drawing area. Functional tests live in `android/app/src/test` (Robolectric Compose UI tests).
- Flutter target (`flutter/`, one codebase for the `ios` and `android` variants): anchors are `Semantics(identifier: "<id>")`; screens and regions use `Semantics(container: true, explicitChildNodes: true, identifier: …)`. Widget tests live in `flutter/test`. The change must work on both variants.
- Native controls keep their platform size (the toggle anchor `settings.notify-toggle` is a declared layout deviation). Everything else follows the prototype's relative layout.
- Everything stays local: no network requests, accounts or persistent storage. Text input must end editing (dismiss the keyboard) when the action that follows it runs.
- Each target changes only its own root (`ios/`, `android/` or `flutter/`). Shared files (`scripts/`, `protoflow.config.json`, `AGENTS.md`, `ACCEPTANCE.md`, `.gitignore`), build settings that keep Gradle and Kotlin daemons off, and the frozen prototypes are operator-owned and must not be changed.
- Keep the existing functional tests passing and extend them for new behaviour.
