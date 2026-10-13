# ProtoFlow 原生平台真實驗收（v0.3.3）

這個分支（`mobile-acceptance`）是 ProtoFlow v0.3.3 的原生平台真實驗收應用：同一份手機原型（來源分支 `protoflow-mobile-20261013` 的 `prototype/`）驅動三份程式碼、四個執行平台：

| target | 程式碼 | 執行平台 |
|---|---|---|
| `ios` | `ios/`（SwiftUI） | iPhone 17 模擬器（iOS 27） |
| `android` | `android/`（Jetpack Compose） | AVD `ProtoFlow_Pixel`（Android 16、480 dpi） |
| `flutter` | `flutter/`（Flutter 3.47） | 變體 `ios`、`android` |

流程：設計者推送原型提交 → `protoflow source scan` 凍結版本 → `protoflow runner start` 依序對每個 target 以真實 Codex 實作、建置、功能測試、T1–T4 分層驗收、有限修復 → 獨立 Codex 審查 → 自動批准（標示為 automated）→ 每個 target 的交付分支 `protoflow/mobile-delivery/<target>` 開 PR 並自動合併回本分支。

基準提交 `300af14` 已由本分支的三份應用實作；之後的原型提交由 ProtoFlow 自動處理。證據保存在驗收工作目錄的 `.protoflow/`（不提交）。
