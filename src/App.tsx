import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/lib/theme';
import { NotepadProvider } from '@/lib/notepad-context';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

// Route-level code splitting: KaTeX and the chart library load only where used (KICKOFF §5 Lighthouse note).
const Read = lazy(() => import('@/pages/Read'));
const Recipes = lazy(() => import('@/pages/Recipes'));
const Recipe = lazy(() => import('@/pages/Recipe'));
const Concepts = lazy(() => import('@/pages/Concepts'));
const Concept = lazy(() => import('@/pages/Concept'));
const Glossary = lazy(() => import('@/pages/Glossary'));
const Figures = lazy(() => import('@/pages/Figures'));
const Figure = lazy(() => import('@/pages/Figure'));
const References = lazy(() => import('@/pages/References'));
const Notes = lazy(() => import('@/pages/Notes'));
const Methods = lazy(() => import('@/pages/Methods'));
const About = lazy(() => import('@/pages/About'));

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <ThemeProvider>
      <NotepadProvider>
        <BrowserRouter basename={basename}>
          <Layout>
            <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 bx-muted min-h-[80vh]" role="status">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/read" element={<Read />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/:id" element={<Recipe />} />
                <Route path="/concepts" element={<Concepts />} />
                <Route path="/concepts/:id" element={<Concept />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/figures" element={<Figures />} />
                <Route path="/figures/:id" element={<Figure />} />
                <Route path="/references" element={<References />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/methods" element={<Methods />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </NotepadProvider>
    </ThemeProvider>
  );
}
