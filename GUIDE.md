# Sports Link — Step-by-Step Deployment Guide

Everything you need to go from zero to a live website. No API keys, no server costs — completely free.

---

## STEP 1: Install the tools (one-time setup)

### 1a. Install Node.js

Go to https://nodejs.org and download the **LTS** version (the big green button). Run the installer.

Verify it worked — open **Terminal** (Mac) or **Command Prompt** (Windows):

```
node --version
```

You should see something like `v20.x.x`.

### 1b. Install Git

- **Mac:** Open Terminal and type `git --version`. If not installed, it'll prompt you.
- **Windows:** Download from https://git-scm.com/download/win

Verify:

```
git --version
```

### 1c. Create free accounts

1. **GitHub** — https://github.com (stores your code)
2. **Vercel** — https://vercel.com (hosts your website — sign up with GitHub)

That's it. No API keys needed.

---

## STEP 2: Create a GitHub repository

1. Go to https://github.com
2. Click **+** → **New repository**
3. Name it `sports-link`
4. Keep it **Public**
5. **Don't** check "Add a README"
6. Click **Create repository**
7. Keep this tab open — you'll need the URL

---

## STEP 3: Set up the project and push to GitHub

Open your terminal:

```bash
# 1. Create the folder and go into it
mkdir sports-link
cd sports-link

# 2. Copy ALL the project files into this folder
#    (see "File Structure" below for exactly where each file goes)

# 3. Initialize git
git init

# 4. Install dependencies
npm install

# 5. Test locally (optional but recommended!)
npm run dev
#    Open http://localhost:5173 in your browser — the game should work!
#    Press Ctrl+C to stop

# 6. Add, commit, push
git add .
git commit -m "Initial commit - Sports Link"
git remote add origin https://github.com/YOUR_USERNAME/sports-link.git
git branch -M main
git push -u origin main
```

### File structure

Make sure your folder looks exactly like this:

```
sports-link/
├── src/
│   ├── data/
│   │   ├── database.js     ← all players, teams, college aliases
│   │   └── lookup.js       ← validation/matching logic
│   ├── App.css              ← styles
│   ├── App.jsx              ← game UI
│   └── main.jsx             ← entry point
├── public/                   ← (empty folder, create it)
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## STEP 4: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Find **sports-link** and click **Import**
4. Leave all defaults
5. Click **Deploy**

In about 30 seconds you'll get a live URL like `sports-link-abc123.vercel.app`.

**That's it. Your game is live.**

---

## STEP 5: Add a custom domain (optional)

If you want a clean URL like `sportslink.com`:

1. Buy a domain from Namecheap, Google Domains, or GoDaddy (~$10-15/year)
2. In Vercel → your project → **Settings** → **Domains**
3. Add your domain and follow the DNS instructions
4. Vercel handles HTTPS automatically

---

## Adding more players

The game currently has 300+ players. To add more, edit `src/data/database.js`.

Each player follows this format:

```js
{ name: "Player Name", teams: ["Team 1", "Team 2"], college: "College Name", numbers: [12, 34], league: "NFL" },
```

Rules:
- **name** — Full name as commonly known
- **teams** — Array of every team they played on (use the full official name)
- **college** — The school they attended, or `null` if they didn't go to college
- **numbers** — Array of jersey numbers they've worn
- **league** — "NFL", "NBA", or "MLB"

After adding players:

```bash
git add .
git commit -m "Added more players"
git push
```

Vercel auto-redeploys in ~30 seconds. Done.

If you add a new college, also add aliases for it in the `COLLEGE_ALIASES` object at the bottom of database.js so people can type shortcuts (e.g., "bama" for "Alabama").

---

## Making other changes

Any time you edit code:

```bash
git add .
git commit -m "description of change"
git push
```

Vercel auto-deploys on every push. Your site updates in about 30 seconds.

---

## Costs

- **Everything:** Free
- **Vercel hosting:** Free (hobby tier)
- **Domain:** ~$10-15/year (optional)
- **API costs:** $0 (all validation runs in the browser)

---

## Troubleshooting

**"npm: command not found"** — Node.js isn't installed. Download from nodejs.org.

**"git: command not found"** — Git isn't installed.

**Player not recognized** — They might not be in the database yet. Add them to `src/data/database.js`.

**Team not matching** — Make sure the team name in the player's `teams` array exactly matches a team in the `TEAMS` array. Add common aliases if needed.

**Site loads but looks broken** — Make sure all files are in the right folders (check structure above).
