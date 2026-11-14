# Chainge

Group habit challenges. You start a challenge, send the link to 2 to 4 friends, and everyone checks in each day. When the whole crew is in, the chain grows by one link. Missed days use shared saves instead of breaking the chain.

It's a free web app (a PWA): people open a link, and can add it to their Home Screen so it works like a normal app. There's no app store and no cost.

Separate from the original Cadence habit tracker. It has its own repo, its own database tables and its own login.

## What's in this folder

| File | What it is |
| --- | --- |
| `index.html` | The page that loads the app |
| `app.js`, `app.css` | The whole app |
| `config.js` | **The only file you edit**: your Supabase address and keys |
| `sw.js` | Service worker: offline support and notifications |
| `manifest.json`, `icon*` | Makes it installable, with its icon |
| `privacy.html` | Privacy policy (add your contact email at the bottom) |
| `supabase/schema.sql` | Database setup |
| `join/` | The website: landing page and crew waitlist |
| `stats/` | Private stats page (waitlist, sources, app usage) |
| `supabase/waitlist.sql` | Database setup for the waitlist and stats |
| `supabase/notifications.sql`, `supabase/functions/crews-push/` | Push notifications (optional) |

## Try it right now (demo mode)

With `config.js` left empty, the app runs in **demo mode**. Everything is saved on that device, you can add pretend "test friends" and tap their faces to check them in, and the You tab has a "Skip to next day" button. Good for trying the flow before the database is set up.

## Going live

About 20 minutes, all free.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**. Call it `cadence-crews`. Pick any region near you and save the database password somewhere.
   - The free plan allows two projects. If you already use both, you can run this in the original Cadence project instead. Every table here starts with `crew_` (or is called `crews`), so nothing clashes. But the login is then shared between the two apps.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.

### 2. Set up sign-in

In **Authentication → Sign In / Providers → Email**:

- Keep **Email** turned on.
- For a small beta, turn **Confirm email** off. Supabase's built-in email only sends a few messages an hour, so with it on, testers get stuck waiting for confirmation emails.
- Before a bigger launch, set up your own email sender under **Authentication → Emails → SMTP Settings** (Resend has a free tier), then turn Confirm email back on. Password reset emails also need this to be reliable.

In **Authentication → URL Configuration**:

- Set **Site URL** to the address from step 4, e.g. `https://tayneoh.github.io/cadence-crews/`.
- Add the same address under **Redirect URLs**.

### 3. Connect the app

In **Project Settings → API**, copy the **Project URL** and the **publishable** (or `anon`) key into `config.js`:

```js
window.CREWS_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseKey: 'sb_publishable_...',
  vapidPublicKey: ''
};
```

These are safe to put in public code. The database rules in `schema.sql` decide what each person can see.

### 4. Put it online (GitHub Pages)

1. In this repo on GitHub, go to **Settings → Pages**.
2. Under "Build and deployment", choose **Deploy from a branch**, then the `main` branch and the `/ (root)` folder, and click **Save**.
3. After a minute your app is live at `https://tayneoh.github.io/cadence-crews/`.

Invite links look like `https://tayneoh.github.io/cadence-crews/?j=abc12345`. Someone who opens one sees the crew, creates an account, and joins in one step.

### 5. Notifications (optional, recommended)

Notifications cover: someone checked in, everyone's in (the chain grew), chain milestones and full weeks, personal streaks, finishing a challenge, nudges and "you're the last link", posts and cheers, new members, and a daily reminder at a time each person picks. Each person can switch any of these off in the You tab. On iPhone they only work after someone adds the app to their Home Screen (iOS 16.4 or later).

1. **Make keys.** On any computer with Node installed, run `npx web-push generate-vapid-keys`. You get a public key and a private key.
2. **Turn on two extensions.** In Supabase, open **Database → Extensions** and enable `pg_net` and `pg_cron`.
3. **Deploy the function.** In **Edge Functions → Deploy a new function → Via editor**, name it `crews-push`, paste in `supabase/functions/crews-push/index.ts`, and deploy. Then open its settings and turn **Verify JWT off**, because a secret header protects it instead.
4. **Add its secrets.** Under **Edge Functions → Secrets**, add:
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: the two keys from step 1.
   - `PUSH_SECRET`: any long random text.
   - `APP_URL`: your app's address, e.g. `https://tayneoh.github.io/cadence-crews/`.
5. **Connect the database.** Open `supabase/notifications.sql` and replace `PUSH_FUNCTION_URL` with the function's address (`https://<project>.supabase.co/functions/v1/crews-push`) and `PUSH_SECRET_VALUE` with your secret. Then run it in the SQL Editor.
6. **Turn it on in the app.** Put the **public** key into `vapidPublicKey` in `config.js`.

## Website, waitlist and stats

- **Landing page:** `join/` (live at `https://tayneoh.github.io/cadence-crews/join/`). Someone signs up, gets a crew link, and sends it to 2 to 4 friends, who join the same waitlist crew. It shows a "crews waiting" counter once there are 10.
- **Stats page:** `stats/` (live at `https://tayneoh.github.io/cadence-crews/stats/`). Private: only admins can load the numbers. Shows waitlist crews and sign-ups by day and by source, visits, campaigns, crew sizes, and the app's users, crews, check-ins, finished crews and retention. "Download waitlist" saves everyone as a CSV for emailing.

To set it up:

1. Run `supabase/waitlist.sql` in the SQL Editor (safe to rerun).
2. Sign up in the app with your own email if you haven't, then make yourself an admin (use your email):
   ```sql
   insert into public.crew_admins (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;
   ```
3. Open `stats/` and sign in with that account.

Tracking links: put `join/?s=tiktok` in the TikTok bio, `join/?s=instagram` in Instagram, and so on. For one video, use `join/?utm_source=tiktok&utm_campaign=day9`. The stats page has a link builder. A visitor is credited to the last tagged link they arrived on, even if they sign up days later on the same phone.

## Updating the database

When the app gains features that need new database pieces, run `supabase/schema.sql` again in the SQL Editor. It's safe to rerun: it keeps your data and only adds what's missing. If you set up notifications, redeploy the `crews-push` function too.

## Running it day to day

- **Reports:** reported posts land in the `crew_reports` table (**Table Editor**), with a copy of the text and the photo path. To remove a post, delete its row in `crew_posts`.
- **Blocking:** people can block each other from any post's menu. A blocked person's posts are hidden and they get no notifications about the blocker.
- **Deleting accounts:** people can delete their own account and everything they posted from the You tab.

## Updating the app

Edit the files and push to `main`. GitHub Pages redeploys on its own. Then bump the version in `sw.js` (`crews-v1` → `crews-v2`) so installed copies pick up the change.

## How the chain works

- **Daily + saves:** everyone checks in each day. The crew shares one save per person. A day with misses uses saves, one for each person who missed. If there aren't enough saves left, the chain breaks and starts over at zero.
- **5 of 7 days:** each person needs 5 check-ins per week. The chain only breaks if someone falls short for the week.
- A day starts at midnight in the time zone of the person who started the crew.
- Someone who joins partway through only counts from the day they joined.
- Challenges can be 7, 14, 21, 30, 60 or 90 days, or any custom length from 3 to 365.
- Each crew picks a color (magenta by default). It colors that crew's chain, buttons and recap.

## Private habits

The Today screen also has a "Just for you" list that only you can see. A **build** habit is ticked off each day and counts a streak. A **break** habit needs no daily tap: it counts days clean, and you tap Slipped if you slip.

Pop-ups appear when you check in, when a crewmate checks in, when everyone is in, when you finish a habit or all of them, and at streak and days-clean milestones. They can be switched off in the You tab.
