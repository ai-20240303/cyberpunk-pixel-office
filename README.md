# TMF Cyberpunk Pixel Office (`pixel-office-btc`)

台指期／微台（TMF）AI 交易系統專屬的**賽博龐克像素戰情室**選配外掛（Optional Plugin）。
所有美術圖檔（辦公室底圖與 6 位賽博龐克角色 Sprite Sheet）與前後端程式碼皆為 **100% 專案自有（由 `scripts/` 腳本程序化生成）**，無任何第三方素材授權限制。

---

## 角色編制（6 位 AI 代理）

| ID | 角色名稱 | 對應職責 | 賽博龐克造型與主題色 |
|----|----------|----------|----------------------|
| `0` | **數據領航員** (`Quote Hub`) | Shioaji 即時行情中樞，每 60s `⏱️` 心跳進入盤房報價 | 電光青護目鏡 + 銀白科技短髮 + 訊號天線 |
| `1` | **夜盤交易員** (`Night Trader`) | 微台夜盤巡航 Worker (`burst_delta_night`) | 霓虹紫光學義眼 + 暗夜連帽戰術夾克 |
| `2` | **首席交易官** (`Order Gateway`) | 統一委託閘道，成交／拒單即時走訪盤房回報 | 雷射橘紅瞄準鏡 + 鈦金重裝裝甲背心 |
| `3` | **日盤交易員** (`Day Trader`) | 微台日盤巡航 Worker (`burst_delta_day`) | 全息青色眼鏡 + 太陽金短髮 + 鈷藍極客西裝 |
| `4` | **WF分析師** (`WF Analyst`) | Walk-Forward 雙軌獨立滾動尋優 (`wf-runner`) | 矩陣綠數據鏡片 + 生化綠挑染 + 銀白研究風衣 |
| `5` | **績效稽核師** (`Post Clerk`) | 收盤 `post-session-pipeline` 對帳與滑價歸因 | 合成波粉紫護目鏡 + 雙馬尾耳機 + 稽核制服 |

---

## 快速啟動（Docker Compose 常駐服務）

在倉庫根目錄執行：

```bash
docker compose up -d --build pixel-office
```

- **戰情室畫面**：`http://localhost:19001/`
- **房間與碰撞編輯器**：`http://localhost:19001/dashboard.html`

---

## 重新生成自製美術素材

若調整了配色或角色細節，可直接執行內建零依賴生成腳本：

```bash
# 重新生成 640x800 賽博龐克戰情室底圖 (assets/oficina.png)
node scripts/generate_cyberpunk_office.js

# 重新生成 6 位賽博龐克角色 Sprite Sheet (assets/characters/char_0~5.png)
node scripts/generate_cyberpunk_characters.js
```

詳細連動事件與時間軸請見 [`PLAY.md`](PLAY.md)。
