# ProtoFlow Expo 真實驗收（提案 0002 P3.5）

這個分支（`expo-acceptance`）是 ProtoFlow Expo target 的真實驗收應用：手機原型（來源分支 `protoflow-expo-20261018` 的 `prototype/`）驅動一份 Expo SDK 58 + Expo Router 程式碼（`expo/`），在兩個變體上驗收：

| target | 變體 | 執行平台 | 啟動 |
|---|---|---|---|
| `expo` | `ios` | iPhone 17 模擬器（iOS 27） | deep link `protoflowtasks://<screen>?state=…&fixture=…` |
| `expo` | `android` | AVD `ProtoFlow_Pixel`（Android 16、480 dpi） | 同上（`ACTION_VIEW` intent） |

`expo/ios/`、`expo/android/` 由 target build 的 `expo prebuild --clean` 產生，被 Git 忽略、不提交。流程：設計者推送原型提交 → Runner 規劃、以 Claude 實作、建置、功能測試（jest-expo）、T1–T4 分層驗收 → 獨立 AI 審查 → 自動批准（標示為 automated）→ 交付分支 `protoflow/expo-delivery/expo` 開 PR 並自動合併回本分支。

基準提交 `cc155bf` 已由本分支實作；之後的原型提交由 ProtoFlow 自動處理。證據保存在驗收工作目錄的 `.protoflow/`（不提交）。
