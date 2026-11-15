# Delete With Style — Outlook add-in

Adds a **Delete with style** menu to emails in Outlook. Pick an effect and the email gets burned, shredded, smashed and so on in a pop-up. When it's done, delete the email in Outlook as usual.

Works in Outlook on the web (outlook.com) and the new Outlook for Windows/Mac with a personal Microsoft account. No admin needed.

## 1. Put the files online (GitHub Pages, free)

1. Sign in at https://github.com (or create a free account).
2. Click **+** (top right) → **New repository**.
   - Name it exactly: `delete-with-style`
   - Choose **Public**, then **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Unzip this package and drag **everything in it** into the upload box (including the `assets` folder). Click **Commit changes**.
5. Go to the repo's **Settings** → **Pages**.
   - Under **Branch**, pick `main` and `/ (root)`, then **Save**.
6. Wait a minute or two, then open
   `https://YOUR-GITHUB-USERNAME.github.io/delete-with-style/effect.html`
   You should see a sample email with a "Burn it!" button. If you do, hosting works.

## 2. Install it in Outlook

You need a `manifest.xml` made for your GitHub username (Claude generates it for you).

1. Go to https://aka.ms/olksideload (or in Outlook on the web: open any email → **Apps** → **Get add-ins**).
2. Choose **My add-ins**, scroll to **Custom add-ins**.
3. Click **Add a custom add-in** → **Add from file…** → pick `manifest.xml` → **Install**.

## 3. Use it

Open an email → click **Apps** in the message toolbar (or the **…** menu) → **Delete with style** → pick an effect → press the big button.

When the animation finishes, close the pop-up and delete the email.

## Removing it

Same place as step 2: **My add-ins** → **Custom add-ins** → **…** next to Delete With Style → **Remove**.
