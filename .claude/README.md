# .claude Directory - Project Documentation

This directory contains comprehensive documentation for the Japan Tax Helper project, optimized for both human developers and AI assistants (like Claude).

## 📁 Directory Structure

```
.claude/
├── README.md              ← You are here
├── CLAUDE.md              ← Start here for AI sessions
├── ARCHITECTURE.md        ← Technical design & decisions
├── FEATURES.md            ← Core features documentation
├── RESEARCH.md            ← Japanese tax law research
├── SESSIONS.md            ← Development session log
├── docs/                  ← (Future) Additional documentation
└── plans/                 ← Implementation plans
    └── sleepy-questing-ritchie.md
```

## 🎯 Quick Start

### For AI Assistants (Claude, GPT, etc.)

**Read these files in order:**
1. `CLAUDE.md` - Context loading guide & patterns
2. `FEATURES.md` - What the app does
3. `ARCHITECTURE.md` - How it's built
4. `RESEARCH.md` - Japanese tax compliance

### For Human Developers

**Start here:**
1. `../README.md` - User-facing documentation
2. `ARCHITECTURE.md` - Technical overview
3. `FEATURES.md` - Feature breakdown
4. `SESSIONS.md` - Development history

## 📄 File Descriptions

### CLAUDE.md
**Purpose**: Main guide for AI assistants
**Contains**:
- Quick context loading instructions
- Key concepts and patterns
- Common development tasks
- Critical rules and constraints
- Helpful prompts for typical requests

**When to read**: Start of every AI session

---

### ARCHITECTURE.md
**Purpose**: Technical architecture documentation
**Contains**:
- System architecture diagrams
- Technology stack decisions & rationale
- Trade-offs considered
- Data flow diagrams
- Performance characteristics
- Security design

**When to read**:
- Before making architectural changes
- When choosing new libraries
- When debugging system-wide issues

---

### FEATURES.md
**Purpose**: Core features and how they work
**Contains**:
- Feature overview and user flows
- Implementation details
- Code snippets and examples
- Performance metrics
- Future enhancements

**When to read**:
- Before adding new features
- When debugging feature-specific issues
- When optimizing performance

---

### RESEARCH.md
**Purpose**: Japanese tax law and compliance research
**Contains**:
- 適格請求書 (Qualified Invoice) requirements
- Consumption tax rates and rules
- Expense categories for 個人事業主
- T-Number validation requirements
- Compliance deadlines and transitions
- Official sources and references

**When to read**:
- Before changing validation logic
- When adding new expense categories
- When updating tax-related features
- Quarterly (to check for law changes)

---

### SESSIONS.md
**Purpose**: Development session log
**Contains**:
- Chronological record of development
- What was built when
- Decisions made and why
- Challenges encountered
- Solutions implemented
- Future priorities

**When to read**:
- Start of new session (check recent activity)
- When wondering "why was this done this way?"
- When tracking progress over time

---

### plans/
**Purpose**: Implementation plans and designs
**Contains**:
- Detailed implementation plans
- Feature specifications
- Design proposals

**When to read**:
- Before starting major new features
- When planning refactors

---

## 🔄 Maintenance Guidelines

### When to Update Documentation

**After every development session:**
- Update `SESSIONS.md` with what was done
- Note any decisions made
- Record any issues encountered

**When architecture changes:**
- Update `ARCHITECTURE.md`
- Explain the change and rationale
- Update diagrams if needed

**When features are added/modified:**
- Update `FEATURES.md`
- Add implementation details
- Update user flows

**When tax laws change:**
- Update `RESEARCH.md`
- Cite official sources
- Update validation logic references

**When patterns change:**
- Update `CLAUDE.md`
- Revise onboarding instructions
- Update common task examples

### Documentation Quality Standards

**Be specific:**
- ❌ "The AI extracts data"
- ✅ "Gemini Vision API extracts 8 fields with confidence scores"

**Include context:**
- ❌ "We use Dexie"
- ✅ "We use Dexie for IndexedDB because it provides type-safe queries and migration support"

**Provide examples:**
- ❌ "Validate the T-Number"
- ✅ "Validate T-Number: `/^T\d{13}$/` - Example: `T1234567890123`"

**Link to sources:**
- ❌ "Japan has tax requirements"
- ✅ "Japan's 適格請求書 requirements ([NTA source](...))"

## 🎓 How to Use This Documentation

### Scenario 1: New AI Session
```
1. Read CLAUDE.md (5 min)
2. Check SESSIONS.md for recent activity (2 min)
3. Ask user: "What would you like to work on?"
4. Read relevant section in FEATURES.md or ARCHITECTURE.md
5. Start working
```

### Scenario 2: Adding a Feature
```
1. Check FEATURES.md to understand existing features
2. Check ARCHITECTURE.md for patterns to follow
3. Check RESEARCH.md for compliance requirements
4. Implement feature
5. Update FEATURES.md with new feature
6. Update SESSIONS.md with changes
```

### Scenario 3: Debugging
```
1. Identify which feature/area is affected
2. Read relevant section in FEATURES.md
3. Check ARCHITECTURE.md for data flow
4. Review SESSIONS.md for recent changes
5. Check CLAUDE.md for common pitfalls
6. Fix issue
7. Update SESSIONS.md with solution
```

### Scenario 4: Understanding Japanese Tax Requirements
```
1. Read RESEARCH.md thoroughly
2. Check external sources linked
3. Verify current year requirements (laws can change)
4. Implement validation logic
5. Update RESEARCH.md if new information found
```

## 📊 Documentation Coverage

| Area | File | Coverage |
|------|------|----------|
| AI Onboarding | CLAUDE.md | ✅ Complete |
| Architecture | ARCHITECTURE.md | ✅ Complete |
| Features | FEATURES.md | ✅ Complete |
| Tax Law | RESEARCH.md | ✅ Complete |
| Development Log | SESSIONS.md | 🔄 Ongoing |
| User Guide | ../README.md | ✅ Complete |
| Quick Start | ../QUICKSTART.md | ✅ Complete |

## 🚀 Future Additions

Potential future documentation:

- `TESTING.md` - Testing strategies and test cases
- `DEPLOYMENT.md` - Deployment guide and operations
- `TROUBLESHOOTING.md` - Common issues and solutions
- `API.md` - API endpoint documentation
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines

## 💡 Tips for AI Assistants

### Quick Reference Patterns

**File location format:**
```
src/app/upload/page.tsx:123
```

**Always cite locations when discussing code:**
- ❌ "The upload handler validates images"
- ✅ "The upload handler in `src/app/upload/page.tsx:45` validates images"

**Use consistent terminology:**
- 適格請求書 = Qualified Invoice
- 登録番号 = T-Number
- 個人事業主 = Individual Business Owner
- 領収書 = Receipt

**When in doubt:**
1. Check CLAUDE.md for patterns
2. Search FEATURES.md for examples
3. Review ARCHITECTURE.md for design principles
4. Ask user for clarification

## 📞 Contact & Contribution

This documentation is maintained alongside the codebase.

**To improve documentation:**
1. Make changes in markdown files
2. Keep format consistent
3. Update "Last Updated" dates
4. Note changes in SESSIONS.md

---

**Last Updated**: January 11, 2026
**Next Review**: Monthly or after major changes
