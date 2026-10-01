# SmartCalc Frontend

This package contains the React + TypeScript frontend for the SmartCalc scientific calculator.

## Scripts

```bash
npm install
npm run dev
npm run build
npm test -- --run
```

## Development notes

- The app can run without the backend by falling back to a local safe parser.
- The API base is configured through the `VITE_API_URL` environment variable.
- The Vite config uses `base: './'` so the built app can also be deployed to GitHub Pages.
