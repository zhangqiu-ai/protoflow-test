# ProtoFlow Web 示範應用

這個獨立 React 應用包含登入、固定本機回覆的對話與說明頁。原始碼可在此目錄內安裝、建置與測試，無需共享引擎或其他專案的依賴目錄。

## 安裝與執行

使用 Node.js 22.22.3 或更新版本。套件版本由 `package.json` 與 `package-lock.json` 固定。

```sh
npm ci
npm run build
npm run preview
```

開啟 `http://127.0.0.1:4173/#/login`，也可透過 `#/chat`、`#/help` 切換畫面。建置產物位於 `dist/`，可交付整個目錄；目前的建置設定也支援直接開啟 `dist/index.html`。

公開示範帳號為 `demo@protoflow.test`，密碼為 `FlowDemo!42`。登入與對話狀態只保留在記憶體，重新載入即重設；對話使用固定本機回覆。

## 重跑回歸測試

首次測試前安裝 Playwright 對應的 Chromium：

```sh
npx playwright install chromium
npm test
```

`npm test` 會先重新建置，再由 Node.js Playwright runner 執行登入、對話、說明頁、錨點與幾何回歸。失敗時的 trace 與截圖保存在 `test-results/`。

`tests/fixtures/prototype/` 是測試專用的凍結原型參考，來源為 `zhangqiu-ai/protoflow-test` 的提交 `76b9a0af9924b7c9f471bda56486030cfa146fe1`。`tests/fixtures/prototype.binding.json` 記錄來源、整版雜湊與每個檔案的 SHA-256；測試開始前會核對這些資訊。renderer 僅載入 `src/` 的獨立實作，測試參考資料不會加入建置產物。

這些是應用自行維護的回歸測試。完整 ProtoFlow 驗收、版本批准與交付狀態由外部流程另行記錄。
