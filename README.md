This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Native Google Sign-In for the Android app

The installed Capacitor Android app uses native Google Credential Manager sign-in and then exchanges the Google ID token with Supabase. The regular website continues to use the existing Supabase OAuth redirect flow.

### Required configuration

1. Create a **Web application OAuth client ID** in Google Cloud Console and set `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` to that value in your local environment and the Vercel project's Environment Variables.
2. In the same Google Cloud project, create an **Android OAuth client** for package name `com.iiith.entrance` and the SHA-1 signing certificate for each build you test. Add the Play App Signing SHA-1 for Play Store releases.
3. Ensure the Google provider is enabled in Supabase and its Google client configuration is set to the matching Web client ID and client secret.
4. Redeploy the Vercel website after setting the environment variable.
5. Install dependencies and sync the native project after pulling the changes:

```bash
npm install
npx cap sync android
```

Build and install a new APK to test native sign-in. The existing APK does not gain the native plugin until it is rebuilt. Do not commit OAuth client secrets or other private credentials to the repository.
