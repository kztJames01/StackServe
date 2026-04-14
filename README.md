# MakerSpace

MakerSpace is a collaborative platform designed for teams to manage projects, tasks, and profiles. Built with a modern tech stack, it provides a seamless experience for team coordination and project tracking.

## 🚀 Features

- **User Authentication**: Secure sign-in and sign-up functionality powered by Firebase.
- **Team Management**: Tools for managing teams and switching between different workspaces.
- **Task Tracking**: A dedicated tasks section for organizing and monitoring project progress.
- **User Profiles**: Personalized profile pages for team members.
- **Explore**: A discovery area to find other projects or collaborators.
- **Modern UI**: A beautiful, responsive interface built with Tailwind CSS, Radix UI, and Three.js for 3D elements.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **Frontend Auth**: [Firebase](https://firebase.google.com/)
- **API Backend**: [Express.js](https://expressjs.com/) (in `backend/`)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kztJames01/makerSpace.git
   cd makerSpace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Run the frontend development server:
   ```bash
   npm run dev
   ```

5. Run the Express API server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

- `app/`: Contains the Next.js App Router pages and layouts.
- `components/`: Reusable UI components, including a dedicated `ui/` folder for base primitives.
- `lib/`: Utility functions and Firebase configuration.
- `backend/`: Express API (`/api/feed`, `/api/profile`, `/api/profile/projects`, `/api/profile/posts`, `/api/tasks`).
- `hooks/`: Custom React hooks.
- `types/`: TypeScript type definitions.

## 📄 License

This project is licensed under the MIT License.
