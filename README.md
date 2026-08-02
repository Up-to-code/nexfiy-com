# Nexfiy

Nexfiy is a flexible productivity workspace where users can create, edit, and organize notes and documents in one intuitive interface.

It uses Convex as the real-time backend, UploadThing for images and files, and Better Auth for user accounts. Each user can also configure private remote MCP server connections from Workspace Settings.

## Live

Nexfiy - [https://nexfiy.com/](https://nexfiy.com/)

## Features

### Productivity and Organization

- 📝 Flexible document editor for seamless note-taking
- 📂 Infinite children documents for hierarchical organization
- 🖐️ Drag-and-drop reordering for intuitive file management
- ⭐ Pin important documents for quick access
- ➡️🔀⬅️ Expandable and fully collapsible sidebar for easy navigation
- 🎨 Customizable icons for each document, updating in real-time
- 🗑️ Trash can with soft delete and file recovery options

### User Experience

- 🌓 Light and Dark mode to suit preferences
- 📱 Full mobile responsiveness for productivity on the go
- 🛬 Landing page for a welcoming user entry point
- 🖼️ Cover image for each document to add a personal touch

### Data Management

- 🔄 Real-time database for instant data updates
- 📤📥 File upload, deletion, and replacement options
- 🔌 Per-user MCP server connections with server-side connection testing

### Security and Sharing

- 🔐 Authentication to secure notes
- 🌍 Option to publish your note to the web for sharing

## Technologies

![NextJS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Shadcn-ui](https://img.shields.io/badge/shadcn/ui-000000.svg?style=for-the-badge&logo=shadcn/ui&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC.svg?style=for-the-badge&logo=Tailwind-CSS&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-111111.svg?style=for-the-badge)
![Convex](https://img.shields.io/badge/Convex-ee342f.svg?style=for-the-badge&logo=Convex&logoColor=white)
![UploadThing](https://img.shields.io/badge/UploadThing-EF1236.svg?style=for-the-badge&logoColor=white)
![Blocknote](https://img.shields.io/badge/Blocknote-ff8c00.svg?style=for-the-badge&logo=Blocknote&logoColor=white)
![dnd-kit](https://img.shields.io/badge/dnd--kit-000000?style=for-the-badge&logo=react&logoColor=white)

## Installation

1. Clone the repository
2. Install the dependencies

```
npm install
```

3. Set up the environment variables

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

UPLOADTHING_TOKEN=

// for deploying
CONVEX_DEPLOY_KEY=
```

4. Run Convex

```
npx convex dev
```

Set Better Auth's deployment variables once for each Convex deployment:

```
npx convex env set BETTER_AUTH_SECRET <a-random-32-byte-secret>
npx convex env set SITE_URL http://localhost:3000
npx convex env set GOOGLE_CLIENT_ID <google-client-id>
npx convex env set GOOGLE_CLIENT_SECRET <google-client-secret>
npx convex env set APPLE_CLIENT_ID com.nexfiy.web
npx convex env set APPLE_CLIENT_SECRET <signed-apple-client-secret>
```

Google OAuth must allow these development callbacks:

```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
```

The production callbacks are:

```
https://nexfiy.com/api/auth/callback/google
https://nexfiy.com/api/auth/callback/apple
```

Apple Sign in requires HTTPS and therefore works through the production domain,
not localhost. The signed Apple client secret expires after at most six months;
rotate it before expiry and update `APPLE_CLIENT_SECRET` in Convex.

Production billing uses the live Nexfiy Dodo brand and product
`pdt_0NkWHmeRZI6qHKsuyAW4f`. Keep local development on the test product. Set the
live API key and webhook secret only in the production Convex deployment, set
`DODO_PAYMENTS_ENVIRONMENT=live_mode`, and configure both server and public
product IDs to the live product. The production webhook endpoint is:

```
https://nexfiy.com/api/auth/dodopayments/webhooks
```

5. Run the development server

```
npm run dev
```

## Acknowledgements

[CodewithAntonio](https://www.youtube.com/@codewithantonio)
