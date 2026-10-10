# ProtoFlow Electron 示範應用

需要 Node.js 22.22.3 以上版本。在本目錄執行：

```sh
npm ci
npm run build
npm start
```

`npm ci` 依本應用的 `package-lock.json` 安裝依賴；Electron 固定為 `44.7.0`。應用不需要 ProtoFlow 引擎，React renderer 由 Vite 建置至 `dist`，Electron 主程序載入 `dist/index.html`。

這是離線示範，沒有帳號服務或 AI 服務。登入使用公開資料 `demo@protoflow.test`／`FlowDemo!42`，成功後清除密碼；對話只產生固定回覆。登入與對話狀態保存在記憶體，重新載入即重設，不使用 cookies 或 Web Storage。Renderer 使用記憶體 session，啟用 `contextIsolation` 並停用 `nodeIntegration`。

畫面路由為 `#/login`、`#/chat`、`#/help`。登入頁與對話頁可互相導覽；Help 說明凍結版本、依序實作及錨點驗證，並提供返回對話的連結。

建置後執行永久回歸測試：

```sh
npm test
```

也可使用 `npm run verify` 依序建置及測試。Node.js Playwright runner 以單一 worker 啟動真實 Electron，六項測試涵蓋初始化前退出、三次冷啟動正常關閉、Help 內容與重新載入／歷史導覽，以及六個凍結畫面狀態的全部錨點、尺寸、樣式和像素。視窗內容固定為 1440×1000，像素差異上限為 0.001，pixelThreshold 為 0.1。

`tests/fixtures/prototype` 僅供測試比較，不會由應用載入或打包至 `dist`。`tests/fixtures/binding.json` 固定來源提交 `76b9a0af9924b7c9f471bda56486030cfa146fe1` 及逐檔 SHA-256，測試先驗證原件再比較畫面。

測試透過 `PF_ACCEPTANCE_USER_DATA` 使用隔離目錄。正常關閉的 15 秒期限包含主程序退出及完整 POSIX 程序組消失，要求 code 0、無 signal 且沒有強制終止。應用保留呼叫端的 `disable-features` 清單，只追加 `DeclarativePerformanceObserver`；第一輪關閉測試另確認傳入的 `Translate` 仍被保留。session 建立後，關閉時先清理其連線，再執行 `app.quit()`；初始化前尚無 session 的退出要求直接沿用 Electron 正常退出。新增的早期退出測試載入真實應用入口，確認 `before-quit` 發生於 ready 前，且在 15 秒內以 code 0、無 signal 退出，完整程序組消失；強制清理不計通過。

既有正常關閉測試曾在 macOS 實際執行；這不代表所有環境的原生關閉問題皆已解決。其他平台為 `NOT_RUN`。程序組檢查依賴 POSIX，Windows 尚無相應驗證。每次執行是否通過，以該次 Playwright 結果及 shutdown 附件為準；未執行不計為通過。
