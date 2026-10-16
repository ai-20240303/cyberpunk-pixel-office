# TMF Cyberpunk Pixel Office (`cyberpunk-pixel-office`)

台指期／微台（TMF）AI 交易系統專屬的**賽博龐克像素戰情室**選配外掛（Optional Plugin）。
本專案基於開源專案 **[BTCx100/pixel-office](https://github.com/BTCx100/pixel-office)**（源自 `piraminet/pixel-office` 與 Pablo Delucca 之 `pixel-agents` 概念）進行深度重構與在地化改造；所有美術圖檔（辦公室底圖與 6 位賽博龐克角色 Sprite Sheet）與繁體中文戰情室控制面板皆為 **100% 專案自製（由 `scripts/` 腳本程序化生成）**，無第三方付費圖塊授權限制。

![TMF Cyberpunk Pixel Office 實機運行畫面](docs/media/cyberpunk-pixel-office-live.png)

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

---

## 致謝與原始來源（Credits & Upstream Attribution）

- **原始專案來源（Upstream Repository）**：[**BTCx100/pixel-office**](https://github.com/BTCx100/pixel-office)（forked from `piraminet/pixel-office`，靈感源自 Pablo Delucca 的 `pixel-agents`）。
- **本倉庫改造內容**：
  - 以零依賴 Node.js 程序化腳本（`scripts/generate_cyberpunk_office.js`、`scripts/generate_cyberpunk_characters.js`）100% 重新繪製 `640 × 800` 賽博龐克戰情室底圖與 6 位角色 Sprite Sheet，完全移除對第三方付費／外部圖塊之依賴。
  - 全面改寫為繁體中文「**微台戰情室控制面板**」（含戰情編制、即時活動紀錄、手動房間調度與 HiDPI 2x 畫布渲染）。
  - 封裝為跨架構 Docker Image（`ghcr.io/ai-20240303/cyberpunk-pixel-office:latest`），支援空 Volume 自動初始化與 REST API 房間座標防呆校準。

