# AceMe

AceMe is a modern web application designed to help users practice job interviews. Built with Next.js, Firebase, and TypeScript, AceMe provides a seamless experience for authentication, interview practice, and feedback collection.

## Features

- **User Authentication**: Sign up and sign in using email and password, powered by Firebase Authentication.
- **Interview Practice**: Access a variety of interview scenarios and questions.
- **Feedback System**: Receive feedback on interview performance.
- **Tech Stack Icons**: Display technology icons for interview context.
- **Responsive UI**: Built with Tailwind CSS and custom UI components for a clean, modern look.

## Tech Stack

- **Next.js**: React framework for server-side rendering and routing.
- **TypeScript**: Type-safe development for reliability and maintainability.
- **Firebase**: Authentication and admin SDK for user management.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Sonner**: Toast notifications for user feedback.
- **Zod**: Schema validation for forms.

## Project Structure

```
aceme/
├── app/                # Next.js app directory (routing, layouts, pages)
│   ├── (auth)/         # Authentication pages (sign-in, sign-up)
│   ├── (root)/         # Main app pages (home, interview, feedback)
│   └── api/            # API routes (e.g., vapi/generate)
├── components/         # Reusable React components (forms, cards, UI)
├── constants/          # Project-wide constants
├── firebase/           # Firebase client and admin configuration
├── lib/                # Utility functions and server/client actions
├── public/             # Static assets (images, icons, covers)
├── types/              # TypeScript type definitions
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── next.config.ts      # Next.js configuration
├── postcss.config.mjs  # PostCSS configuration
├── eslint.config.mjs   # ESLint configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Firebase project (for authentication)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/venkideshVenu/AceMe-Where-Preparation-Meets-Precision.git
   cd AceMe-Where-Preparation-Meets-Precision/aceme
   ```
2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```
3. **Configure Firebase:**
   - Add your Firebase config to `firebase/client.ts` and `firebase/admin.ts`.
   - Set up authentication in your Firebase console.
4. **Environment Variables:**
   - Create a `.env.local` file in the root and add necessary environment variables (e.g., Firebase API keys).

### Running the App

```sh
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:3000`.

## Scripts

- `dev`: Start the development server
- `build`: Build the application for production
- `start`: Start the production server
- `lint`: Run ESLint

## Folder Details

- **app/**: Contains Next.js pages, layouts, and API routes.
- **components/**: UI and form components (e.g., `AuthForm`, `InterviewCard`).
- **firebase/**: Firebase client and admin setup.
- **lib/**: Utility functions and server/client actions.
- **public/**: Static assets (logos, icons, images).
- **types/**: TypeScript type definitions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub or contact the maintainer.
