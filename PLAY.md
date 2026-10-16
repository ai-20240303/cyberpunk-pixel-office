# Pixel Office（BTCx100）— TMF 試玩

Upstream: https://github.com/BTCx100/pixel-office

## 啟動（建議 Mac；本機 npm 若壞可 tunnel）

```bash
# on mac-air
cd ~/Sources/n8n-workflow/ai-trading-view/plugins/pixel-office-btc
cp -n .env.example .env   # PORT=19001
mkdir -p data && cp -f sample-data/agents.tmf.json data/agents.json && cp -f sample-data/map.tmf.json data/map.json
npm install && npm start
```

Windows 開發機開隧道後瀏覽：

```powershell
ssh -N -L 19001:localhost:19001 mac-air
```

- 辦公室：http://localhost:19001/
- Dashboard：http://localhost:19001/dashboard.html  
  密碼：`pixeladmin`（見 `.env` 的 `DASHBOARD_PASSWORD`）

## 已預劃房間／角色

| 房間 | 誰在那 |
|------|--------|
| 休息房 | 日盤／WF／收工（預設睡覺、不亂走） |
| 行情走廊 | 行情中樞 |
| 夜盤房 | 夜盤交易員 |
| 下單房 | 下單閘道 |

辦公室畫面會畫半透明色塊＋中文房名。

- **休息房**：日盤／WF／收工預設在此；`roomBound` 只在房內走動＋常聊天。任何人被派進休息房後也會改成此行為。
- **其他房**：預設 `holdStill` 待命（可用 AI 導演／API 移動）。

## 接交易訊號（adapter bridge）

`execution/.env`：

```
PIXEL_OFFICE_BRIDGE=1
PIXEL_OFFICE_URL=http://host.docker.internal:19001
```

- adapter 啟動（Container Power boot）→ 行情中樞／下單閘道進房，其餘進休息房  
- `POST /tasks/futures-session/start` → 夜盤進夜盤房／日盤進日盤房  
- 送單 → Trader 短暫走進下單房再回崗位  

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

- 背景預設是 `assets/oficina-placeholder.png`；正式 tileset 需自備 `assets/oficina.png`（見 upstream README）。
- Port 固定用 **19001**（對應 `execution/.env` 的 `PIXEL_OFFICE_URL`）。
