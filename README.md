# Netflix Desktop Clone (Cinematic Edition) 🎬

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6+-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38bdf8.svg)](https://tailwindcss.com/)

<p align="center">
  <img src="assets/billboard.jpg" alt="Netflix Clone Hero Billboard" width="100%">
</p>

A high-fidelity, pixel-perfect recreation of the Netflix Desktop experience. Built with **Vanilla JavaScript** and **Tailwind CSS**, this project replicates the sophisticated UI/UX of the world’s leading streaming platform with dynamic data handling and smooth cinematic transitions.

---

## 📸 Interface Showcase

| 🏆 Top 10 Ranking System | 🔍 Smart Search Interface |
| :---: | :---: |
| <img src="assets/top10.jpg" width="400"> | <img src="assets/search.jpg" width="400"> |
| *Iconic outlined typography with overlapping poster logic.* | *Debounced search engine with cinematic mini-modal hovers.* |

---

## 🚀 Key Features

### 1. Automated Hero Billboard Rotation
The hero section is a dynamic engine that fetches the top 10 latest blockbuster titles and rotates them every 7 seconds.
* **Cinematic Transitions:** Custom CSS-in-JS logic for synchronized fade transitions.
* **Dynamic Metadata:** Real-time fetching of plots and ratings via OMDB API.

### 2. Professional UI Components
* **Top 10 Global Rankings:** Authentic implementation of the iconic outlined ranking numbers (1-10) overlapping movie posters.
* **Mini-Modal Hover System:** Advanced hover logic that scales posters by **1.5x** and reveals metadata using `cubic-bezier` timing.
* **Maturity Rating Sidebar:** Precisely positioned floating indicator to match the official desktop site.

### 3. Smart Content Engine
* **Search-to-Grid Transition:** A debounced search system that instantly swaps the home feed for a responsive results grid.
* **Global Deduplication:** Custom logic tracking 30+ categories to ensure no movie repeats.
* **Strict Quality Filter:** Automatically discards results lacking high-quality posters.

---

## 🛠️ Technical Stack

| Category | Technology |
| :--- | :--- |
| **Language** | JavaScript (ES6+) |
| **Styling** | Tailwind CSS (Utility-first) |
| **Icons** | Font Awesome 6.4.0 |
| **Data Source** | OMDB API (Open Movie Database) |
| **Typography** | Google Fonts (Roboto) |

---

## 🧠 Technical Deep Dive

### Deduplication Algorithm
To ensure a diverse feed across 30+ categories, I implemented a global `Set` to prevent redundant content from appearing side-by-side:

```javascript
const globalMovieSet = new Set();

// Deduplication Logic
const filteredMovies = data.Search.filter(movie => {
    if (movie.Poster === 'N/A') return false; // Quality Filter
    if (globalMovieSet.has(movie.imdbID)) return false; // Deduplication
    globalMovieSet.add(movie.imdbID);
    return true;
});
