# Startpage

A custom browser start page built with vanilla HTML, CSS and JavaScript.

Designed to match my desktop themes across Windows, Linux and macOS, with quick links, theme switching and a live Pinterest inspiration feed.

![Startpage](screenshots/startpage-komorebi.png)

## Features

- Responsive custom dashboard
- Dynamic greeting, time and date
- Search bar
- Categorised quick links
  - Media
  - Tools
  - Social
  - Work
- Four selectable themes
  - Everforest
  - BlackMetalKhold / Komorebi
  - Catppuccin
  - Arch / Zen
- Theme preference saved with `localStorage`
- Live Pinterest masonry feed
- Pinterest RSS processed through a Cloudflare Worker
- Responsive masonry layout
- Hosted with GitHub Pages

## Pinterest Feed

The Pinterest panel uses my public Pinterest RSS feed rather than Pinterest's embedded widget.

The flow is:

Pinterest RSS  
→ Cloudflare Worker  
→ JSON  
→ custom JavaScript masonry grid

This keeps the feed live while allowing the Pinterest content to inherit the visual style of the start page.

## Themes

### BlackMetalKhold / Komorebi

![Komorebi](screenshots/startpage-komorebi.png)

### Everforest

![Everforest](screenshots/startpage-everforest.png)

### Arch / Zen

![Arch Zen](screenshots/startpage-zen.png)

## Files

```text
startpage/
├── index.html
├── style.css
├── script.js
└── README.md
