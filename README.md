# DreamCraft AI browser demo

DreamCraft AI is configured as a standalone React demo. The deployed frontend does not connect to the Express server, a database, Socket.IO, or an external AI service. Demo accounts, designs, quotes, orders, messages, profiles, and small uploaded images are saved in the current browser's local storage.

## Run locally

1. Install Node.js 20 or newer.
2. In a terminal, open `client` and run:

   ```powershell
   npm install
   npm run dev
   ```

3. Open the Vite URL printed in the terminal.
4. On the sign-in page, choose either demo account. Both use the password `dream123`:
   - Customer: `customer@dreamcraft.demo`
   - Artisan: `artisan@dreamcraft.demo`

You can also register a local demo account. Use Logout to switch between the customer and artisan sample accounts; both roles share the same demo data in that browser.

## Demo behavior and limits

- Data is browser- and device-specific. There is no shared user database, cross-device messaging, or real account security.
- Chat is saved locally and refreshes periodically while the page is open. It is not a live service.
- The AI assistant uses a fixed local demo response; it does not call an AI model.
- Reference, profile, and portfolio uploads are stored as browser data URLs. Each file must be 750 KB or smaller, and browser storage limits apply. Clear the site's local storage to reset the sample data.
- This demo is for exploration, not real transactions, authentication, or private information.

## Deploy to Vercel

The Vercel project should use the `client` directory as its Root Directory:

1. Import this project in Vercel and set **Root Directory** to `client`.
2. Keep the framework preset as **Vite**.
3. Use `npm run build` as the build command and `dist` as the output directory.
4. Deploy. The included `vercel.json` sends app routes to `index.html` so direct navigation and refreshes work.

No backend environment variables or secrets are needed for this browser demo. Do not copy backend credentials into Vercel.
