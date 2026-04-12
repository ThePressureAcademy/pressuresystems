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
- one privacy policy page
- one LiftIQ product route under `/liftiq/`
- a working mailto-based enquiry fallback
- a live Formspree path on the LiftIQ contact routes
- optional support for a future Formspree endpoint on the main Pressure Systems audit form
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

The main Pressure Systems audit form launches with a working email-draft path.

To connect a live Formspree endpoint later on the main audit form:

1. Open `site-config.js`
2. Set `formEndpoint` to the live Formspree endpoint URL
3. Redeploy the site

If `formEndpoint` is blank, the form opens a structured email draft to `sales@pressuresystems.au`.

The LiftIQ contact, design-partner and briefing paths retain their existing Formspree handling.

## Local preview

Open `index.html` directly in a browser for a quick review, or serve the folder with any static file server.

## Deployment

This project is configured to deploy cleanly as a static Vercel site.
