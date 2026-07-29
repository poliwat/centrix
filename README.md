# Centrix — Movement Website

A fast, single-purpose website for the Centrix movement (written under the pen name Saint Moses the Black). Static HTML/CSS/JS — no build step, no framework. Edit the files in any text editor and refresh your browser.

## Files

| File | What it is |
|------|-----------|
| `index.html` | The main landing page. This is the heart of the site. |
| `data.html` | "The Data" page — the three declines with interactive charts (uses Chart.js from a CDN). |
| `favicon.svg` | The browser-tab icon (the Centrix mark). |
| `logo.svg` | Scalable logo with wordmark — use it for social profiles, headers, print. |
| `theme-warm.css` | Optional alternate color scheme (earthy / grassroots). See "Changing the colors." |
| `Centrix-Party-Handout.pdf` | One-page printable handout. |
| `handout.html` | Source for the handout PDF. |
| `LAUNCH-PLAN.md` | Your $2,000 launch + interest-test plan. Read this next. |
| `centrix-party.html` | Older backup copy of the landing page (safe to ignore or delete). |

---

## Where to publish it (so it scales if it takes off)

You asked for something better than GitHub Pages for scale. Here's the honest breakdown:

**Recommended: Cloudflare Pages.** Free, with **unlimited bandwidth** on a 300+ location global CDN — so if a post goes viral, the site won't slow down or get throttled. Supports your custom domain with free HTTPS. This is the best fit for "might get a lot of views." ([source](https://chlp8.medium.com/rock-solid-website-for-1-experience-with-cloudflare-pages-and-github-6e735e4f614c))

**Also great: Netlify.** Nearly as easy, with built-in form handling (handy for your sign-up form). Free tier has a bandwidth cap that's fine for most launches.

**GitHub Pages** is perfectly good to *start*, but its bandwidth is a soft ~100 GB/month and it can throttle a site that spikes — so it's the weakest of the three for a movement you're actively trying to make go viral.

### Publish on Cloudflare Pages (fast path)

1. Put these files in a folder (or a GitHub repo — Cloudflare can deploy straight from it).
2. Create a free account at [pages.cloudflare.com](https://pages.cloudflare.com).
3. **Create a project → Direct Upload** (or **Connect to Git**). Upload the folder.
4. It deploys to a `*.pages.dev` URL in seconds.
5. **Custom domain:** buy a domain (~$10–20/yr), then in the project go to **Custom domains → Set up a domain** and follow the DNS steps. HTTPS is automatic.

### Or Netlify (drag-and-drop)

Go to [app.netlify.com/drop](https://app.netlify.com/drop), drag the folder in, done. Add your domain under **Domain settings**. Netlify Forms will capture your sign-up form automatically if you add `netlify` to the `<form>` tag.

### Or GitHub Pages (fine for early testing)

New public repo → upload files → **Settings → Pages → Deploy from a branch → main / root**. Live at `https://USERNAME.github.io/REPO/`.

---

## Connecting the site to real tools

Out of the box, the sign-up form and the Discord/Substack buttons are **placeholders**. Wire them up:

**Sign-up form → real submissions**
- **Formspree (works anywhere):** sign up at [formspree.io](https://formspree.io), get an endpoint like `https://formspree.io/f/abcdwxyz`, then in `index.html` change
  `<form class="volunteer" id="volunteerForm">` to
  `<form class="volunteer" action="https://formspree.io/f/abcdwxyz" method="POST">`
  and delete the small `<script>` block just after the form.
- **Netlify Forms (if hosting on Netlify):** add `name="volunteer" netlify` to the `<form>` tag and remove that `<script>` block.
- **Or embed Substack's subscribe box** directly and let Substack own the list.

**Discord + Substack buttons**
- In `index.html`, find the two links with `data-link="discord"` and `data-link="substack"` and replace their `href="#"` with your real invite/URL.

---

## Editing the site

Plain HTML/CSS in one file (`index.html`). Landmarks — search for these:

- **Colors** — the `:root { ... }` block at the top of `<style>`. Change once, updates everywhere.
- **Writer's note & pen name** — search for `founder-note` and the `Saint Moses the Black` card under `class="lead"`. Edit the note and the pen-name blurb however you like.
- **The three statistics** — search for `stat-grid` (home page) and edit the numbers in `data.html` charts (the `data:[...]` arrays in the `<script>` at the bottom).
- **Platform planks** — search for `class="issue"`. Each has three cells: left wisdom, right wisdom, Centrix synthesis.
- **FAQ** — search for `class="faq"`. Each item is a `<details>` block.
- **Sources** — in the `<footer>` and on `data.html`.

## Changing the colors

Two ways:

1. **Quick swap to the warm theme:** in `index.html` and `data.html`, add this line right after the closing `</style>` tag:
   `<link rel="stylesheet" href="theme-warm.css">`
   Delete the line to revert. (It just overrides the color variables.)
2. **Your own palette:** edit the values in the `:root { ... }` block directly (`--navy`, `--gold`, etc.).

## Re-exporting the handout PDF

Edit `handout.html`, then open it in Chrome → **Print → Save as PDF** (margins *None*, enable *Background graphics*). It's laid out for one US-Letter page.

---

## What to do next

Read **`LAUNCH-PLAN.md`** — it lays out the free foundation to set up first, how to spend the $2,000, the organic strategy, a 4-week timeline, and the political-ad compliance steps you need to start early.

---

*Centrix is an independent citizen movement, written under the pen name Saint Moses the Black. The policy ideas here are proposals offered for discussion, not official positions of any ballot-registered party or candidate campaign.*
