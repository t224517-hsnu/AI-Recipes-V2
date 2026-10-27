# 糕點辨識教室 完整套件 v2

包含手機辨識前台、低信心提示、教師密碼後台、模型與食譜檢查、全班共用設定、版本紀錄及還原。

**本版部署方式為 GitHub 儲存程式碼 → GitHub Actions 自動部署 → Cloudflare Workers + R2。GitHub Pages 不能單獨執行密碼後台與版本儲存。**

## 第一次部署 六個步驟

### 1 上傳完整專案

解壓縮後，將此資料夾裡的內容上傳到 GitHub 儲存庫根目錄。根目錄應看得到 `package.json`、`wrangler.json`、`web/`、`worker/`、`scripts/`，以及 `.github/workflows/deploy.yml`。不要只上傳 ZIP，也不要再多包一層資料夾。預設分支使用 `main`。

本機建置使用 Node.js 24，無 npm 相依套件，不必先執行 npm install：

```sh
npm run build
npm run validate
npm test
```

### 2 建立 Cloudflare R2 儲存桶

登入自己的 Cloudflare 帳號，啟用 R2，建立名為 `pastry-ai-settings` 的儲存桶。儲存桶用來保留設定及版本紀錄，不必開啟公開讀取。

若使用其他名稱，同步修改 `wrangler.json` 的 `r2_buckets[0].bucket_name`；保留 `binding` 為 `BUCKET`。確認 Cloudflare 帳號已設定 Workers 的 `workers.dev` 子網域，供部署後產生網址。

### 3 設定四個 GitHub Secrets

在儲存庫選 **Settings → Secrets and variables → Actions → New repository secret**，新增下列四項。密碼與 Token 只填在 Secrets，不要提交至原始碼。

| Secret 名稱 | 填入內容 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 您自己的 Cloudflare API Token，可使用官方 Edit Cloudflare Workers 範本，並確認可部署 Worker、使用指定 R2 資源。 |
| `CLOUDFLARE_ACCOUNT_ID` | 該 Cloudflare 帳號的 Account ID。 |
| `ADMIN_PASSWORD` | 要使用的教師後台密碼，可沿用目前課堂密碼。 |
| `ADMIN_SESSION_SECRET` | 固定保留的隨機密鑰，至少 32 字元，與後台密碼分開。 |

可在自己的電腦用下列指令產生 session 密鑰，將結果貼入對應 Secret：

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

### 4 執行自動部署

到 **Actions → Deploy pastry classroom → Run workflow**。流程會檢查 Secrets、建置、測試，再部署前台與後台，並寫入 Worker 的管理密鑰。

若第一次上傳時尚未填好 Secrets 而失敗，設定完成後重新執行即可。之後每次推送程式碼到 `main` 也會自動部署。不需啟用 Settings → Pages。

### 5 取得網站網址

在成功的 Actions Deploy 步驟，或 Cloudflare Workers 控制台，取得實際的 HTTPS 網址。前台為首頁，教師後台為同一網址加上 `/admin`。請使用平台回傳的網址，不要猜網址。

此獨立部署不包含原 ChatGPT Sites 的登入名單：學生前台可由網址開啟，教師後台仍需密碼。若學校要限制前台存取，需另由資訊人員設定。

### 6 完成課前驗收

- 手機開啟前台，確認三款食譜可讀取，並測試相機或照片上傳。
- 後台以您設定的密碼登入，填模型與食譜連結。
- 按「檢查連結與資料」，確認預覽後才按「上傳並套用」。
- 另一部裝置重新整理，確認取得相同設定。
- 修改 Google 原食譜，等待儲存後，前台按「重新讀取食譜」。
- 在版本紀錄測試還原。還原會建立新版本，恢復連結與當時食譜快照，不修改 Google 原檔。

## 課堂與檔案說明

低於 80% 時提示「可能是新的糕點，尚未收錄在食譜中」，也提醒調整光線與角度。信心值不是準確率。

食譜三欄固定為「辨識名稱、材料、步驟」，一種糕點一列，材料和步驟格內換行。每個模型類別都須有同名食譜。新增糕點需模型與食譜同時更新。

| 路徑 | 用途 |
|---|---|
| `web/` | 手機前台、教師後台、完整教案與學生檢核表。 |
| `worker/server.js` | 密碼驗證、資料檢查、發布及還原的後端原始碼。 |
| `worker/index.js` | 已組合的完整 Worker，可重新建置。 |
| `wrangler.json` | Cloudflare 部署與 R2 綁定。 |
| `.github/workflows/deploy.yml` | GitHub 自動部署流程。 |
| `scripts/`、`tests/` | 建置、驗證、本機預覽及測試。 |
| `materials/pastry-recipes.xlsx` | 三款糕點 Excel 食譜範本。 |
| `web/recipes.csv` | 三欄 CSV 範本。 |
| `materials/COURSE-LINKS.txt` | Canva 簡報及目前課堂資源。 |

可在 Google Sites 加入按鈕連到部署完成的新網址。完整兩小時教案位於 `web/teacher-guide.html`，上線後可由前台「教師教案」開啟。

本套件不含雲端帳號密碼、API Token 或原站台的 R2 資料。既有後台版本紀錄留在原網站；這次獨立部署會建立自己的版本紀錄。原模型與 Google 原檔仍由原服務管理，模型若被刪除，不能從本套件重建。

## 本機開發

Node.js 24 下，複製 `.env.example` 為 `.dev.vars` 並自行填入兩個管理密鑰。執行 `npm run build`、`npm run dev`，使用終端顯示的網址。本機資料在 `.local-data/`，與雲端分開。不要把 `.dev.vars` 上傳至 GitHub。

修改前台請編輯 `web/`，修改後端請編輯 `worker/server.js`；`worker/index.js` 由建置產生。

## 驗證範圍

本套件已從獨立目錄完成建置、輸出檢查及自動測試。新版功能已在原 Sites 線上網站驗證；尚未在您的 GitHub／Cloudflare 帳號執行 Actions，仍需先完成帳號、R2 與 Secrets 設定。

## 官方文件

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://github.com/cloudflare/wrangler-action
- https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
- https://developers.cloudflare.com/workers/wrangler/configuration/
