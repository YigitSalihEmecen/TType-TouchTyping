# TType - Smart Touch Typing Trainer

A modern typing trainer that adapts to your weaknesses, focusing practice on your most problematic letters for faster improvement.

## Features

- **Smart Word Selection**: Analyzes your accuracy and selects words containing letters you struggle with
- **Real-Time Metrics**: Live WPM and accuracy tracking with 15-second rolling averages  
- **QWERTY Layout Display**: Letter accuracy shown in familiar keyboard layout
- **Clean UI**: Minimal design with smooth animations and responsive layout
- **No Backspace**: Encourages proper muscle memory by preventing corrections

## How to Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/YigitSalihEmecen/TType.git
   cd TType
   ```

2. **Start a local server** (required for loading word files)
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## How It Works

1. **Type the highlighted letter** - text only advances when you type correctly
2. **Letters turn red** after advancing if you made mistakes on them  
3. **Algorithm learns** from your mistakes and serves words with your weak letters
4. **Track progress** with real-time WPM and per-letter accuracy stats

## Tech Stack

- Vanilla JavaScript, HTML5, CSS3
- Uses `words_common.txt` for intelligent word selection
- No frameworks or dependencies

**Start typing to improve your touch typing skills!** 