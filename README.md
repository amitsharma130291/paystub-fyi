# PayStub.fyi

Free pay stub generator for employees, contractors, and gig workers.

## Features

- Real 2024 federal and state tax calculations
- Download professional pay stub PDF
- Supports all 50 states
- No signup required, no watermark, completely free

## Tech Stack

- [Astro](https://astro.build/) — framework
- [React](https://react.dev/) — interactive islands
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [Stripe](https://stripe.com/) — payments (premium features)
- [Vercel](https://vercel.com/) — hosting

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
src/
  components/
    Header.astro
    Footer.astro
    RelatedLinks.astro
    PayStubForm.tsx       # React island — pay stub calculator
  layouts/
    Base.astro            # HTML shell + SEO meta
    ToolPage.astro        # Tool pages with embedded form
    BlogPost.astro        # Blog/content pages
  lib/
    pdf-generator.ts      # jsPDF pay stub generator
  data/
    states.ts             # 25-state data with tax rates + law summaries
    gig-platforms.ts      # 12 gig platform pay structures
  pages/
    index.astro           # Home page
public/
  robots.txt
```

## Deployment

Deployed on Vercel with hybrid rendering (static + server-side API routes).

## License

MIT
