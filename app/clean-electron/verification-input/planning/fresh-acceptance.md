# 全新 GitHub → Codex → Electron 驗收規格

此為等效規格草案，等待人類確認；Spec Kit／BMad CLI 尚未安裝，不能宣稱其產生了本文件。唯一功能設計輸入是當前 Context Package 指向的 GitHub SHA 凍結原型，較新提交不能提前實作。初始應用只有 React 計數器；舊應用與舊批准均未匯入。

第一版本實作虛構登入：空值、格式及長度驗證；錯誤虛構資料提示；trim/lowercase 電郵；正確資料顯示工作區；鍵盤提交、退出清空及重新載入重置。僅接受原型中明示的 demo@fresh.protoflow.test／FreshDemo42!，密碼只在記憶體中使用，不作真實認證、不連網、不持久化。

第二版本才加入對話頁：保留全部登入回歸，React hash route #conversation 顯示原型對話；空白拒絕、trim 訊息、一次使用者訊息和固定示範回覆、重複提交防止重複訊息、HTML 字串顯示為純文字、新對話清空及重新載入重置。不呼叫外部 AI，不持久化。原型 index.html／conversation.html 連結在應用轉成 #login／#conversation。

實作只在 app/renderer/src/ 使用獨立 React 元件、狀態及事件處理。可以閱讀凍結 HTML/CSS 取得設計，但不能載入原型 HTML、iframe、innerHTML 或整頁 HTML 注入；建置輸出必須來自本應用 Vite。維護專案自己的 Node Playwright 回歸測試，以 scripts/electron-fixture.mjs 接上適配器管理的真正 Electron renderer；禁止用另起 Chromium 頁面冒充應用。

操作員的 scripts/fresh-acceptance.spec.mjs 是 18 項驗收條件。第一版本 11 項登入與 React 掛載條件執行，7 項對話因當前凍結 SHA 不含對話明示 SKIP；第二版本全部 18 項執行。應用尚未實作，因此目前不宣稱功能驗收通過。

視覺先驗收 6 個登入狀態，第二版本加入 4 個對話狀態並保留登入。兩端相同 1000×760 CSS 像素、DPR1、en-US、UTC、light、reduce；字型與圖片就緒，停用動畫，無遮罩、無位移對齊。逐像素 threshold 0.1、整體與關鍵 mapping 差異比率上限 0.005，完整原始圖片、side-by-side、50% source-over overlay、diff、場景及 SHA／manifest／應用／產物雜湊留存。尺寸、場景、環境或狀態不符必須 FAIL，不產生可接受的比較結果。

禁止修改操作員管理的 electron/main.cjs、scripts/electron-acceptance.mjs、electron-fixture.mjs、fresh-acceptance.spec.mjs、fresh-playwright.config.mjs、build.mjs、setup.mjs、protoflow.config.json、package/lock、AGENTS.md、ACCEPTANCE.md、Skill、specs、凍結原型或 .protoflow/fail-build。操作員會核對受保護檔案雜湊。可新增應用自己的測試，但不可放寬既有條件。

Runner 在隔離 worktree 內逐版真正呼叫 Codex，再獨立 build／functional／visual，修復最多 2 次。失敗阻塞較新 SHA，修復需保存失敗證據；停止及重新啟動不能重複或跳版。操作員可以用明示 fail-build marker 驗證失敗阻塞，移除後依 runner retry 恢復；不將故障注入當成應用成功。

引擎在完整回歸與獨立複核通過後固定；本輪應用驗收不再修改引擎。GitHub 遠端僅可在已批准 protoflow-clean-prototypes-20261007 分支推送兩筆限定原型提交，不改 main、不強制推送、不合併、不部署。L3 登入的架構決策必須另外由人類批准，且 ADR 綁定當前 manifestHash；遠端分支授權不等於 ADR 批准。
