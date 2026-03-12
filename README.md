Netflix Desktop Clone (Cinematic API Edition) 🎬

A high-fidelity, pixel-perfect recreation of the Netflix Desktop experience. Built with Vanilla JavaScript, Tailwind CSS, and integrated with the OMDB API, this project replicates the sophisticated UI/UX of the world's leading streaming platform.


🚀 Key Features

1. Automated Hero Billboard Rotation

The hero section isn't static. It fetches a pool of the latest blockbuster titles and rotates them every 7 seconds.

Cinematic Transitions: Features custom CSS fade-in/out logic for titles and descriptions.

Dynamic Metadata: Displays maturity ratings, plot summaries, and high-definition backdrops.

2. Professional Netflix UI Components

Top 10 Global Rankings: Authentic implementation of the large, outlined ranking numbers (1-10) overlapping movie posters.

Mini-Modal Hover System: Advanced hover logic that scales posters by 1.5x and reveals detailed metadata (Match %, Year, Rating, Genre) without clipping or layout shifts.

Maturity Rating Sidebar: Floating rating indicator precisely positioned to match the official desktop site.

3. Smart Content Engine

Search-to-Grid Transition: A debounced search system that instantly swaps the home feed for a responsive search result grid.

Global Deduplication: A custom logic layer that tracks every displayed movie ID to ensure the same title never appears twice in the same session.

Strict Quality Filter: Automatically discards API results lacking high-quality posters to maintain a premium visual aesthetic.

4. Deep Catalog Exploration

Over 30+ curated categories including Trending Now, Japanese Anime, Bollywood Hits, Sci-Fi Thrillers, and more.

🛠️ Technical Stack

Category

Technology

Language

JavaScript (ES6+)

Styling

Tailwind CSS (Utility-first)

Icons

Font Awesome 6.4.0

API

OMDB (The Open Movie Database)

Typography

Google Fonts (Roboto)

🧠 Technical Deep Dive

Deduplication Algorithm

To ensure a diverse feed, I implemented a global Set that prevents redundant content:

const globalMovieSet = new Set();

// Logic applied during fetch
const filteredMovies = data.Search.filter(movie => {
    if (globalMovieSet.has(movie.imdbID)) return false;
    globalMovieSet.add(movie.imdbID);
    return true;
});


Smooth Scaling Logic

The "Mini-Modal" uses transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1) to achieve that specific Netflix "snap" when hovering over movie cards.

⚙️ Installation & Usage

Clone the Repo

git clone [https://github.com/28vishnu/netflix-clone.git](https://github.com/28vishnu/netflix-clone.git)


API Configuration
Open index.html and locate the API_KEY constant.

const API_KEY = 'YOUR_OMDB_KEY_HERE';


Run Locally
Simply open index.html in any modern web browser. No npm install or local server required.

📸 Showcase

Main Billboard

Top 10 Ranking

Search Grid







👤 Author

Saketh

GitHub: @28vishnu

LinkedIn: Saketh Nanduri

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

Disclaimer: This project is for educational purposes only. Netflix is a trademark of Netflix, Inc.

Developed with ❤️ by Saketh
