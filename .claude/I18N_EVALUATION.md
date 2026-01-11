# i18n Implementation Evaluation

## Problem Statement

Current implementation has a language switcher UI but doesn't actually change the app language because:
1. Translation strings exist but aren't used in components
2. Hardcoded Japanese text throughout JSX
3. No translation context/provider
4. Manual implementation incomplete

## Options Evaluated

### Option 1: next-intl (Recommended for URL-based routing)

**Pros:**
- Built specifically for Next.js 14 App Router
- Type-safe translations
- Excellent documentation
- Server Component support
- Automatic locale detection
- Number/date formatting built-in

**Cons:**
- Designed for URL-based routing (`/en/dashboard`, `/ja/dashboard`)
- Heavier bundle: 31.4 kB gzipped
- Overkill for client-only apps
- Requires middleware setup

**Best for:** SEO-focused apps with URL-based locales

**Bundle Size:** 101.3 kB → 31.4 kB (gzip)

**References:**
- [next-intl Documentation](https://next-intl.dev/docs/getting-started/app-router)
- [Why I Chose next-intl](https://medium.com/@isurusasanga1999/why-i-chose-next-intl-for-internationalization-in-my-next-js-66c9e49dd486)

---

### Option 2: react-i18next (Recommended for client-side apps) ⭐

**Pros:**
- Most popular React i18n library (battle-tested)
- Built-in localStorage support via `i18next-browser-languageDetector`
- Automatic language detection and persistence
- Simple hooks API: `useTranslation()`
- Smaller bundle: 22 kB total (7 kB react-i18next + 15 kB i18next)
- Works great with client-side only apps
- Namespace support for organizing translations
- Interpolation, pluralization built-in

**Cons:**
- Not Next.js specific
- Requires more initial configuration
- Need to import i18next-browser-languageDetector separately

**Best for:** Client-side apps, localStorage-based switching, our use case ✅

**Bundle Size:** 80.7 kB → 25.5 kB (gzip) with next-i18next, or ~22 kB with react-i18next alone

**References:**
- [React Localization with i18next - Phrase](https://phrase.com/blog/posts/localizing-react-apps-with-i18next/)
- [Complete Guide to Multilingual Support in React](https://www.zignuts.com/blog/complete-guide-multilingual-support-react-i18n)

---

### Option 3: Custom Implementation (Current)

**Pros:**
- Full control
- Zero dependencies
- Smallest possible bundle (0 kB added)
- Simple for small apps
- Fast to implement for basic needs

**Cons:**
- Missing features (pluralization, interpolation, namespaces)
- No automatic language detection
- Manual context management
- Need to implement persistence ourselves
- Less type-safe
- Reinventing the wheel

**Best for:** Very simple apps with <20 strings, no complex requirements

**Bundle Size:** ~2 kB (our current implementation)

---

### Option 4: Intlayer (Modern alternative)

**Pros:**
- Component-scoped translations (better tree-shaking)
- TypeScript-first
- Modern API

**Cons:**
- Newer, less mature
- Smaller community
- Less documentation

**Best for:** New projects wanting cutting-edge approach

---

### Option 5: FormatJS (react-intl)

**Pros:**
- No dependencies beyond react-intl
- Lighter than i18next: 17 kB gzipped
- ICU message format
- Simple, less opinionated

**Cons:**
- Less feature-packed than i18next
- No built-in localStorage support
- Less popular than react-i18next

**Best for:** Apps needing ICU message format

**Bundle Size:** 17 kB gzipped

---

## Recommendation Matrix

| Criteria | next-intl | react-i18next | Custom | Winner |
|----------|-----------|---------------|---------|---------|
| Client-only apps | ⚠️ Ok | ✅ Excellent | ✅ Good | react-i18next |
| localStorage switching | ⚠️ Manual | ✅ Built-in | ⚠️ Manual | react-i18next |
| Bundle size | ❌ 31.4 kB | ✅ 22-25 kB | ✅✅ ~2 kB | Custom |
| TypeScript support | ✅✅ Excellent | ✅ Good | ⚠️ Manual | next-intl |
| Documentation | ✅✅ Excellent | ✅ Good | ❌ None | next-intl |
| Maturity | ✅ Mature | ✅✅ Very Mature | N/A | react-i18next |
| Maintenance | ✅ Active | ✅✅ Very Active | ⚠️ We maintain | react-i18next |
| Learning curve | ⚠️ Moderate | ✅ Easy | ✅✅ Very Easy | Custom |
| Feature completeness | ✅✅ Complete | ✅✅ Complete | ❌ Basic | Tie |

## Final Recommendation

### For This Project: **react-i18next** ⭐

**Reasoning:**
1. ✅ Our app is **client-side only** (all pages use 'use client')
2. ✅ We want **localStorage-based** switching (not URL-based)
3. ✅ We need **professional-grade** i18n without overkill
4. ✅ Built-in language detection and persistence
5. ✅ Smaller bundle than next-intl
6. ✅ Battle-tested with millions of downloads
7. ✅ Simple hooks API fits our React patterns

**Trade-offs Accepted:**
- ❌ Adds ~22 kB to bundle (acceptable for production app)
- ❌ Requires initial setup (one-time cost)

**Why Not next-intl:**
- Designed for URL-based routing (`/en/dashboard`)
- We use localStorage toggle instead
- Heavier bundle for features we don't need
- Server Component features unused

**Why Not Custom:**
- Missing critical features (pluralization, interpolation)
- Manual work for language detection
- Not production-ready
- Reinventing the wheel

## Implementation Plan

### Phase 1: Install Dependencies
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### Phase 2: Setup i18n Configuration
- Create `src/lib/i18n/config.ts`
- Configure i18next with localStorage detector
- Define translation namespaces
- Set fallback language

### Phase 3: Create Translation Files
- Move translations to JSON files
- Organize by namespace (common, upload, dashboard)
- Structure: `src/locales/en/common.json`, `src/locales/ja/common.json`

### Phase 4: Create Provider
- Wrap app with `I18nextProvider`
- Initialize i18n on app start
- Handle loading states

### Phase 5: Update Components
- Replace hardcoded text with `t()` calls
- Use `useTranslation()` hook
- Update LanguageSwitcher to use `i18n.changeLanguage()`

### Phase 6: Testing
- Test language switching
- Verify localStorage persistence
- Check all strings are translated

---

## Sources

- [next-intl App Router Documentation](https://next-intl.dev/docs/getting-started/app-router)
- [Comparison: next-i18next vs react-intl](https://i18nexus.com/posts/comparing-next-i18next-and-react-intl)
- [React i18next Guide - Phrase](https://phrase.com/blog/posts/localizing-react-apps-with-i18next/)
- [i18next Browser Language Detector](https://github.com/i18next/i18next-browser-languageDetector)
- [Complete Guide to Multilingual Support in React](https://www.zignuts.com/blog/complete-guide-multilingual-support-react-i18n)
- [Best i18n Libraries for Next.js 2025](https://medium.com/better-dev-nextjs-react/the-best-i18n-libraries-for-next-js-app-router-in-2025-21cb5ab2219a)

---

**Decision:** Implement **react-i18next** for production-ready, client-side i18n with localStorage persistence.

**Next Steps:** Install dependencies and implement properly throughout the app.
