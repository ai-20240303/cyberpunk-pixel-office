# Pixel Office（BTCx100）— 通用多代理引擎 & 微台指期貨預設樣板 (`PRESET=tmf`) 試玩

Upstream: https://github.com/BTCx100/pixel-office

> **架構定位**：`cyberpunk-pixel-office` 是 **100% 通用型、REST 事件驅動的多代理虛擬辦公室（Event-Driven Multi-Agent Pixel Office）**。引擎層本身完全不綁定任何期貨或金融交易程式碼，所有房間定義、碰撞格、角色職稱與閒置台詞（`idleLines`）皆由 `/app/data/map.json` 與 `/app/data/agents.json` 資料驅動。
> **預設樣板（Default Preset）**：開箱預設載入 **微台指期貨戰情室（`PRESET=tmf`，別名 `quant-trading`）**，未來只需在 `sample-data/` 新增 `map.<preset>.json` 與 `agents.<preset>.json`，即可一鍵擴充切換至 `podcast-studio`、`dev-team` 等任何多代理場景！

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

## 預設微台指期貨樣板（`PRESET=tmf`）已預劃房間／六角色

| 房間 | 預設／值勤角色 |
|------|----------------|
| 休息房 | 非值勤人員（日盤／夜盤交易員、WF 分析師、績效稽核師待命時段；`roomBound` 房內走動＋聊天） |
| 情報大廳 | `#0 數據領航員`（Quote Hub） |
| 夜盤房 | `#1 夜盤交易員`（`burst_delta` 開窗期間） |
| 委託執行室 | `#2 首席交易官`（Order Gateway） |
| 日盤房 | `#3 日盤交易員`（`burst_delta_day` 開窗期間） |
| 研究室 | `#4 WF 分析師`（Walk-Forward 執行中）／`#5 績效稽核師`（Post-Session 覆盤對帳中） |

辦公室畫面會畫半透明色塊＋中文房名，角色閒置台詞（`idleLines.post` / `idleLines.rest`）亦直接由 `agents.json` 載入。

- **休息房**：非值勤人員預設在此；`roomBound` 只在房內走動＋常聊天。任何人被派進休息房後也會立即寫入 `data/agents.json` 並鎖定權威房間，不受前端舊快照覆寫。
- **其他房**：預設由後端外掛 `execution/plugins/pixel_office_bridge.py` 或任何外部系統透過 `POST /api/agent/:id/command` 驅動走位與對接。

## 通用事件 Webhook 與接交易訊號（adapter bridge — Optional 外掛）

### 1. 通用 HTTP POST 事件協定（任何外部系統皆可調用）

```http
POST http://localhost:19001/api/agent/2/command
Content-Type: application/json

{
  "action": "move",
  "room": "委託執行室",
  "x": 8,
  "y": 4,
  "state": "sit",
  "message": "入座簽核：委託 BUY filled✅"
}
```
> 同時相容 `tileX` / `tileY` / `sitAfter` / `msg` 欄位格式；若目標座標不在該房間內，伺服器會自動校準至房內最佳可行走／座椅格。

### 2. 微台指期貨 `broker-adapter` 連動設定

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

手動測：`POST http://localhost:19001/api/agent/0/command` body `{"action":"move","room":"情報大廳","x":6,"y":12,"state":"sit","message":"測試報價連線📡"}`

## 重置或切換 Preset（預設 `tmf` 微台指期貨，可自行擴充）

透過 API 一鍵重置回預設微台指期貨樣板（或切換至未來擴充的其他 Preset）：

```powershell
Invoke-RestMethod -Method Post http://localhost:19001/api/preset -ContentType application/json -Body '{"preset":"tmf"}'
```

或手動複製樣本檔：

```powershell
mkdir data -Force
copy sample-data\agents.tmf.json data\agents.json
copy sample-data\map.tmf.json data\map.json
```

## 試走一圈（curl / PowerShell）

Quote Hub 走進夜盤房 → Night 走進下單房：

```powershell
# Quote Hub → 夜盤房
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/0/command -ContentType application/json -Body '{"action":"move","room":"夜盤房","x":3,"y":4,"message":"派送最新夜盤報價⚡"}'
# Night → 委託執行室入座
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/1/command -ContentType application/json -Body '{"action":"move","room":"委託執行室","x":8,"y":4,"state":"sit","message":"送出突破買單🚀"}'
# Post 收工到研究室對帳
Invoke-RestMethod -Method Post http://localhost:19001/api/agent/5/command -ContentType application/json -Body '{"action":"move","room":"研究室","x":16,"y":22,"state":"sit","message":"盤後歸因對帳中📊"}'
```

Dashboard 可手調房間標籤、角色位置、碰撞格；存檔會寫入 `data/`。

## 注意

- 辦公室底圖 (`assets/oficina.png`) 與 6 位賽博龐克角色圖 (`assets/characters/char_0~5.png`) 均由 `scripts/` 內建腳本 100% 自製生成（零第三方素材版權依賴）。
- Port 固定用 **19001**（對應 `execution/.env` 的 `PIXEL_OFFICE_URL`）。
