# Zotion

This project is a simplified clone of the popular productivity application, Notion. It's designed to replicate some of the core features of Notion, providing a platform where users can create, edit, and organize their notes in a flexible and intuitive interface.

It uses Convex as the real-time backend, UploadThing for images and files, and Better Auth for user accounts. Each user can also configure private remote MCP server connections from Workspace Settings.

## Live

Zotion - [https://zotion-app.vercel.app/](https://zotion-app.vercel.app/)

## Features

### Productivity and Organization

- 📝 Notion-style editor for seamless note-taking
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
```

5. Run the development server

```
npm run dev
```

## Acknowledgements

[CodewithAntonio](https://www.youtube.com/@codewithantonio)
