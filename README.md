# 🧠 BrainDonald's

> *"Serving knowledge is the same as remembering it."*

A WebXR VR experience that teaches 12-year-olds how memory and learning work — by making them work behind the counter of a brain-themed fast-food restaurant.

Built with **Three.js + WebXR**, targeting **Meta Quest 3** via browser.

---

## 🎮 How It Works

You're the new store manager of BrainDonald's. Customers (your own consciousness) walk up and order a piece of knowledge. Your job: find it in the storage aisles, unlock the bin by solving a memory puzzle, pick it up, and deliver it to the station.

Every mechanic maps to a real memory process:

| Game element | Brain process |
|---|---|
| Customer placing an order | Retrieval cue — external prompt triggering memory search |
| Walking to the storage aisle | Directed attention / memory search |
| 3×3 puzzle lock on the bin | Effortful retrieval — difficulty reflects synaptic strength |
| Puzzle getting easier each visit | LTP / retrieval-induced strengthening (testing effect) |
| Puzzle resetting after 60s | The forgetting curve — unused memory fades |
| Delivering to the station | Successful recall output |

---

## 🧩 The Memory Puzzle

Each storage bin has a **3×3 grid** on its door. The grid lights up squares in a sequence — the player must tap them back in the same order.

| Times retrieved (within 60s) | Squares that light up |
|---|---|
| 1st time | 5 |
| 2nd | 4 |
| 3rd | 3 |
| 4th | 2 |
| 5th+ | 1 |

If the player doesn't return within **60 seconds**, the difficulty resets — modeling the forgetting curve.

---

## 🗂️ Knowledge Categories

Three aisles, nine facts — each bin is labeled with the fact itself:

| 🟡 Math | 🟢 Food | 🔵 Sports |
|---|---|---|
| 2 + 2 = 4 | Bananas grow on plants | FC Bayern München won |
| 5 × 3 = 15 | Oranges have Vitamin C | Soccer: 11 players |
| 12 ÷ 4 = 3 | Honey never spoils | Basketball: 4 quarters |

---

## 🛠️ Tech Stack

- **Three.js** — 3D rendering
- **WebXR API** — VR session management (Quest 3 browser)
- **Vite** — dev server with HTTPS (required for WebXR)
- **Firebase Hosting** — deployment target
- **Web Audio API** — SFX
- **HTML Audio** — pre-recorded voice lines

No external VR framework, no AI API, no backend.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Meta Quest 3 (or a WebXR-compatible browser for desktop testing)

### Install & Run

```bash
npm install
npm run dev
```

Open `https://localhost:5173` in your desktop browser.

To test on Quest 3: your Mac and Quest must be on the **same WiFi**. Vite will print a LAN URL like `https://192.168.x.x:5173` — open that in the Quest browser and accept the self-signed certificate.

### Build & Deploy

```bash
# Production build
npm run build

# Deploy to Firebase (set your project ID in .firebaserc first)
npx firebase-tools deploy
```

---

## 🎙️ Adding Voice Lines

Drop pre-recorded `.mp3` files into `public/voice/` following the naming convention:

```
public/voice/
├── orders/
│   ├── order_math_01.mp3       "One Math fact, please!"
│   ├── order_food_01.mp3       "Got any Food facts?"
│   └── order_sports_01.mp3    "One Sports fact, please!"
├── puzzle/
│   ├── puzzle_start_01.mp3    "Watch the sequence carefully!"
│   ├── puzzle_fail_01.mp3     "Oops, try again!"
│   └── puzzle_success_01.mp3  "You got it!"
├── delivery/
│   ├── deliver_success_01.mp3  "Great job!"
│   └── deliver_wrong_01.mp3   "That's not what they ordered..."
└── narrator/
    └── welcome_01.mp3          "Welcome to BrainDonald's!"
```

Add multiple `_02`, `_03` variants for any event — the system picks randomly. Missing files are silently skipped.

---

## 📁 Project Structure

```
src/
├── core/           # VRSession, InputManager, GameState, AudioManager, VoiceManager
├── environment/    # Restaurant, Counter, StorageAisle, DeliveryStation
├── gameplay/       # StorageBin, MemoryPuzzle, KnowledgeItem, CustomerNPC, OrderSystem
├── ui/             # SpeechBubble, Scoreboard
├── content/        # knowledgeDatabase.js, voiceMap.js
└── utils/          # TextLabel.js
```

---

## 🔬 Science Behind It

This experience is grounded in cognitive science research:

- **Testing Effect** — retrieving information strengthens memory more than re-reading it
- **Desirable Difficulty** — effortful retrieval produces stronger, longer-lasting memories
- **Forgetting Curve** — unused memories fade; retrieval resets and flattens the curve
- **Spacing Effect** — retrieving a memory as it's fading produces stronger consolidation than retrieving it while still fresh

---

*Built for a cognitive science learning project. Primitive geometry — GLB model swap coming soon.*