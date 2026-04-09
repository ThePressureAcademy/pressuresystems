# Pressure Systems Site

Static MVP site for Pressure Systems.

## Why this stack

The first public Pressure Systems site is intentionally simple:

- static HTML
- static CSS
- light JavaScript

That keeps the site:

- easy to deploy
- easy to maintain
- easy to extend
- separate from research, prospecting and operations material

## What is included

- one homepage / landing page
- one audit-first conversion path
- a working mailto-based enquiry fallback
- optional support for a future Formspree endpoint
- brand assets needed by the site
- metadata and social preview setup
- `robots.txt` and `sitemap.xml`
- Vercel-ready static configuration

## What is intentionally excluded

- strategy files
- prospect data
- outreach notes
- archived workspace material
- blog and multi-page sprawl
- fake case studies

## Form configuration

The site launches with a working email-draft path.

To connect a live Formspree endpoint later:

1. Open `site-config.js`
2. Set `formEndpoint` to the live Formspree endpoint URL
3. Redeploy the site

If `formEndpoint` is blank, the form opens a structured email draft to `sales@pressuresystems.au`.

## Local preview

Open `index.html` directly in a browser for a quick review, or serve the folder with any static file server.

## Deployment

This project is configured to deploy cleanly as a static Vercel site.
