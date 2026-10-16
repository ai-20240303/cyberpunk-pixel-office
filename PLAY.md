# Pixel Office（BTCx100）— TMF 試玩

Upstream: https://github.com/BTCx100/pixel-office

## 啟動（隨根目錄 `docker compose up -d` 常駐）

Pixel Office 已整合至根目錄 `docker-compose.yml` 的 `pixel-office` 常駐服務（Port `19001`）：

```bash
# on mac-air（根目錄）
cd ~/Sources/n8n-workflow
docker compose up -d pixel-office
```

> 若仍想在宿主機手動以 Node 啟動，請先 `docker compose stop pixel-office` 再執行 `./start.sh`。

Windows 開發機開隧道後瀏覽：

```powershell
ssh -N -L 19001:localhost:19001 mac-air
```

- 辦公室：http://localhost:19001/
- Dashboard：http://localhost:19001/dashboard.html  
  密碼：`pixeladmin`（見 `.env` 的 `DASHBOARD_PASSWORD`）

## 已預劃房間／六角色

| 房間 | 預設／值勤角色 |
|------|----------------|
| 休息房 | 非值勤人員（日盤／夜盤交易員、WF 分析師、績效稽核師待命時段；`roomBound` 房內走動＋聊天） |
| 情報大廳 | `#0 數據領航員`（Quote Hub） |
| 夜盤房 | `#1 夜盤交易員`（`burst_delta` 開窗期間） |
| 委託執行室 | `#2 首席交易官`（Order Gateway） |
| 日盤房 | `#3 日盤交易員`（`burst_delta_day` 開窗期間） |
| 研究室 | `#4 WF 分析師`（Walk-Forward 執行中）／`#5 績效稽核師`（Post-Session 覆盤對帳中） |

辦公室畫面會畫半透明色塊＋中文房名。

- **休息房**：非值勤人員預設在此；`roomBound` 只在房內走動＋常聊天。任何人被派進休息房後也會立即寫入 `data/agents.json` 並鎖定權威房間，不受前端舊快照覆寫。
- **其他房**：預設 `holdStill` 待命（由後端外掛 `execution/plugins/pixel_office_bridge.py` 透過 `/api/agent/:id/command` 驅動走位與對接）。

## 接交易訊號（adapter bridge — Optional 外掛）

`execution/.env`：

```ini
PIXEL_OFFICE_BRIDGE=1
PIXEL_OFFICE_URL=http://pixel-office:19001
```

- adapter 啟動（Container Power boot）→ `#0 數據領航員` 進「情報大廳」、`#2 首席交易官` 進「委託執行室」，其餘進「休息房」  
- `POST /tasks/futures-session/start` → 夜盤進「夜盤房」／日盤進「日盤房」  
- 盤中每 60s `⏱️` 行情心跳 → `#0 數據領航員` 走進當前盤房與交易員面對面報價，停留後回情報大廳  
- 送單 → 交易員走進「委託執行室」與 `#2 首席交易官` 面對面確認，再回盤房  
- 收盤（`session/stop` 或開倉窗結束）→ 該盤交易員回「休息房」（在途背景執行緒具防呆守衛不會拉回盤房）、`#5 績效稽核師` 進「研究室」覆盤，完成後回「休息房」  
- Container Power `idle-and-down`／`down` → 全員回「休息房」

手動測：`POST http://localhost:19001/api/agent/0/command` body `{"action":"move","tileX":5,"tileY":12,"msg":"測試"}`

重置為 TMF 樣本：

```powershell
mkdir data -Force
copy sample-data\agents.tmf.json data\agents.json
copy sample-data\map.tmf.json data\map.json
```

## 試走一圈（curl）

Quote Hub 走進夜盤房 → Night 走進下單房：

```powershell
# Quote Hub → 夜盤房
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/0/move -ContentType application/json -Body '{"x":320,"y":480,"state":"walking"}'
# Night → 下單房
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/1/move -ContentType application/json -Body '{"x":520,"y":480,"state":"walking"}'
# Post 收工起床到夜盤房
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/5/move -ContentType application/json -Body '{"x":320,"y":480,"state":"idle"}'
```

Dashboard 可手調房間標籤、角色位置、碰撞格；存檔會寫入 `data/`。

## 注意

- 辦公室底圖 (`assets/oficina.png`) 與 6 位賽博龐克角色圖 (`assets/characters/char_0~5.png`) 均由 `scripts/` 內建腳本 100% 自製生成（零第三方素材版權依賴）。
- Port 固定用 **19001**（對應 `execution/.env` 的 `PIXEL_OFFICE_URL`）。
