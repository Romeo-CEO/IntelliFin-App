# IntelliFin Design Brief

## Overview
IntelliFin is a comprehensive, cloud-based financial management and compliance platform designed specifically for Zambian Small and Medium Enterprises (SMEs). This responsive web application serves as an all-in-one financial command center, integrating core bookkeeping, invoicing, expense management, and seamless mobile money transaction processing with automated ZRA tax compliance.

This design brief establishes the visual language and interaction patterns that will create a cohesive, intuitive, and trustworthy experience for Zambian business owners and their staff.

## Core Design Principles

- **Clean & Modern:** Prioritizing simplicity, whitespace, and clear layouts
- **Approachable & Intuitive:** Easy to understand and interact with, catering to varying levels of technical expertise
- **Trustworthy:** Professional, consistent, and reliable appearance
- **Vibrant & Optimistic:** Using color and subtle visual elements to convey positivity and energy
- **Mobile-First:** Optimized for mobile browsers with progressive enhancement for larger screens
- **Subtle Local Context:** Thoughtfully weaving in local relevance in visuals and copy

## Color Palette

### Primary Colors
- **IntelliBlue** - #005FAD (Primary brand color for buttons, active states, and key UI elements)
- **Pure White** - #FFFFFF (For card backgrounds, modals, and text on dark backgrounds)

### Secondary Colors
- **IntelliTeal** - #00A99D (For supporting elements and background tints)
- **IntelliSky** - #87CEEB (For supporting elements, background tints, and subtle highlights)

### Accent Colors
- **IntelliSun** - #FFB81C (For secondary CTAs, highlights, and attention-grabbing elements)
- **IntelliCopper** - #B87333 (For secondary accents and decorative elements)

### Functional Colors
- **Success Green** - #2E8B57 (For success states, positive values, and income representation)
- **Warning Orange** - #FFA500 (For warning states and cautionary information)
- **Error Red** - #DC143C (For error states, negative values, and expense representation)

### Neutral Colors
- **Neutral-900** - #1A1A1A (Near-black for primary text)
- **Neutral-700** - #4D4D4D (Dark grey for sub-text, icons)
- **Neutral-500** - #CCCCCC (Medium grey for borders, dividers)
- **Neutral-300** - #E6E6E6 (Light grey for disabled states, subtle backgrounds)
- **Neutral-100** - #F5F5F5 (Very light grey for page backgrounds)

### Background Colors
- **Background Primary** - #F5F5F5 (Neutral-100, primary app background)
- **Background Card** - #FFFFFF (Pure white for cards, modals, and content areas)
- **Background Highlight** - #E6F1F8 (Light blue tint for highlighted sections, derived from IntelliBlue)
- **Background Success** - #EFF8F2 (Light green tint for success-related content areas)
- **Background Warning** - #FFF8E6 (Light orange tint for warning-related content areas)
- **Background Error** - #FFF0F0 (Light red tint for error-related content areas)

## Typography

### Font Families
- **Headings:** Poppins
- **Body & UI:** Inter
- **Web Fallback Stack:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"

### Font Weights
- **Regular (400):** Standard body text, labels
- **Medium (500):** Sub-headings (H3, H4), button text, UI elements
- **SemiBold (600):** Main headings (H1, H2), strong emphasis

### Text Styles

#### Headings
- **H1:** 2.5rem/3.25rem (40px/52px), Poppins SemiBold, Letter spacing -0.2px
  - *Used for main page titles and major headers*
- **H2:** 2rem/2.6rem (32px/42px), Poppins SemiBold, Letter spacing -0.2px
  - *Used for major section headers*
- **H3:** 1.5rem/2rem (24px/32px), Poppins Medium, Letter spacing -0.1px
  - *Used for sub-sections and card titles*
- **H4:** 1.25rem/1.75rem (20px/28px), Poppins Medium, Letter spacing -0.1px
  - *Used for minor headings and group titles*

#### Body Text
- **Body Large:** 1.125rem/1.7rem (18px/27px), Inter Regular, Letter spacing 0px
  - *Used for featured content and important information*
- **Body Default:** 1rem/1.5rem (16px/24px), Inter Regular, Letter spacing 0px
  - *Standard text for most UI elements*
- **Body Small:** 0.875rem/1.3rem (14px/21px), Inter Regular, Letter spacing 0.1px
  - *Used for secondary information and supporting text*

#### Special Text
- **Caption/Tiny:** 0.75rem/1.125rem (12px/18px), Inter Regular, Letter spacing 0.2px
  - *Used for timestamps, metadata, and legal text*
- **Button Text:** 1rem/1.5rem (16px/24px), Inter Medium, Letter spacing 0.1px
  - *Used specifically for buttons and interactive elements*
- **Financial Figures:** 1rem/1.5rem (16px/24px), Inter Medium, font-variant-numeric: tabular-nums
  - *Used for monetary values and numerical data with columnar alignment*
- **Label Text:** 0.875rem/1.3rem (14px/21px), Inter Medium, Letter spacing 0.1px
  - *Used for form labels and section titles*

## UI Components

### Buttons

#### Primary Button
- **Background:** IntelliBlue (#005FAD)
- **Text Color:** Pure White (#FFFFFF)
- **Typography:** Button Text (1rem/16px, Inter Medium)
- **Shape:** 8px border radius
- **Padding:** 12px 24px (adjusts responsively)
- **States:**
  - **Hover:** Slightly darker blue (#004F8D), transition: 0.2s ease
  - **Focus:** Blue outline (3px), high contrast
  - **Active/Pressed:** Darker blue (#004070), slight scale transform (0.98)
  - **Disabled:** 40% opacity, no hover effects, cursor: not-allowed

#### Secondary Button
- **Background:** Transparent
- **Border:** 1.5px solid IntelliBlue (#005FAD)
- **Text Color:** IntelliBlue (#005FAD)
- **Typography:** Button Text (1rem/16px, Inter Medium)
- **Shape:** 8px border radius
- **Padding:** 12px 24px (adjusts responsively)
- **States:**
  - **Hover:** Light blue background (#E6F1F8), transition: 0.2s ease
  - **Focus:** Blue outline (3px), high contrast
  - **Active/Pressed:** Darker border (#004070), slight scale transform (0.98)
  - **Disabled:** 40% opacity, no hover effects, cursor: not-allowed

#### Text Button
- **Background:** Transparent
- **Text Color:** IntelliBlue (#005FAD)
- **Typography:** Button Text (1rem/16px, Inter Medium)
- **Padding:** 12px 16px (adjusts responsively)
- **States:**
  - **Hover:** Light blue background (#E6F1F8), transition: 0.2s ease
  - **Focus:** Blue outline (2px), high contrast
  - **Active/Pressed:** Darker text (#004070), slight scale transform (0.98)
  - **Disabled:** 40% opacity, no hover effects, cursor: not-allowed

#### Accent Button
- **Background:** IntelliSun (#FFB81C)
- **Text Color:** Neutral-900 (#1A1A1A)
- **Typography:** Button Text (1rem/16px, Inter Medium)
- **Shape:** 8px border radius
- **Padding:** 12px 24px (adjusts responsively)
- **States:**
  - **Hover:** Slightly darker yellow (#E6A618), transition: 0.2s ease
  - **Focus:** Yellow outline (3px), high contrast
  - **Active/Pressed:** Darker yellow (#CC9414), slight scale transform (0.98)
  - **Disabled:** 40% opacity, no hover effects, cursor: not-allowed

#### Destructive Button
- **Background:** Error Red (#DC143C)
- **Text Color:** Pure White (#FFFFFF)
- **Typography:** Button Text (1rem/16px, Inter Medium)
- **Shape:** 8px border radius
- **Padding:** 12px 24px (adjusts responsively)
- **States:**
  - **Hover:** Slightly darker red (#C01236), transition: 0.2s ease
  - **Focus:** Red outline (3px), high contrast
  - **Active/Pressed:** Darker red (#A01030), slight scale transform (0.98)
  - **Disabled:** 40% opacity, no hover effects, cursor: not-allowed

### Form Elements

#### Text Input
- **Background:** Pure White (#FFFFFF)
- **Border:** 1px solid Neutral-500 (#CCCCCC)
- **Text Color:** Neutral-900 (#1A1A1A)
- **Placeholder Color:** Neutral-700 (#4D4D4D)
- **Typography:** Body Default (1rem/16px, Inter Regular)
- **Shape:** 8px border radius
- **Padding:** 12px 16px
- **States:**
  - **Hover:** Border color darkens to Neutral-700
  - **Focus:** Border color changes to IntelliBlue (#005FAD), 2px width
  - **Disabled:** Background Neutral-300 (#E6E6E6), text Neutral-700
  - **Error:** Border color Error Red (#DC143C), error message below in Error Red

#### Dropdown/Select
- **Background:** Pure White (#FFFFFF)
- **Border:** 1px solid Neutral-500 (#CCCCCC)
- **Text Color:** Neutral-900 (#1A1A1A)
- **Icon Color:** Neutral-700 (#4D4D4D)
- **Typography:** Body Default (1rem/16px, Inter Regular)
- **Shape:** 8px border radius
- **Padding:** 12px 16px
- **States:** Same as Text Input
- **Dropdown Menu:**
  - Background: Pure White
  - Option Hover: Background Neutral-100 (#F5F5F5)
  - Selected Option: Light blue background (#E6F1F8), IntelliBlue text

#### Checkbox
- **Unchecked:**
  - Border: 1.5px solid Neutral-500 (#CCCCCC)
  - Background: Pure White (#FFFFFF)
  - Size: 20px × 20px
  - Shape: 4px border radius
- **Checked:**
  - Background: IntelliBlue (#005FAD)
  - Checkmark: Pure White (#FFFFFF)
- **States:**
  - **Hover:** Border color darkens to Neutral-700
  - **Focus:** Blue outline (2px)
  - **Disabled:** Background Neutral-300, checkmark Neutral-500

#### Radio Button
- **Unchecked:**
  - Border: 1.5px solid Neutral-500 (#CCCCCC)
  - Background: Pure White (#FFFFFF)
  - Size: 20px × 20px
  - Shape: Circular (50% border radius)
- **Checked:**
  - Border: 1.5px solid IntelliBlue (#005FAD)
  - Inner Circle: IntelliBlue (#005FAD)
- **States:** Same as Checkbox

#### Toggle Switch
- **Off State:**
  - Track: Neutral-500 (#CCCCCC)
  - Handle: Pure White (#FFFFFF)
  - Size: 40px × 24px (track), 20px diameter (handle)
- **On State:**
  - Track: IntelliBlue (#005FAD)
  - Handle: Pure White (#FFFFFF)
- **States:**
  - **Hover:** Slight opacity change
  - **Focus:** Blue outline (2px)
  - **Disabled:** Opacity reduced to 40%

### Cards & Containers

#### Standard Card
- **Background:** Pure White (#FFFFFF)
- **Border:** None
- **Shadow:** 0px 4px 12px rgba(0, 0, 0, 0.08)
- **Shape:** 12px border radius
- **Padding:** 24px (adjusts responsively)
- **States:**
  - **Hover (if interactive):** Subtle shadow increase
  - **Active (if interactive):** Slight scale transform (0.99)

#### Flat Card
- **Background:** Pure White (#FFFFFF)
- **Border:** 1px solid Neutral-300 (#E6E6E6)
- **Shadow:** None
- **Shape:** 12px border radius
- **Padding:** 24px (adjusts responsively)

#### Dashboard Widget Card
- **Background:** Pure White (#FFFFFF)
- **Border:** None
- **Shadow:** 0px 2px 8px rgba(0, 0, 0, 0.06)
- **Shape:** 12px border radius
- **Header:**
  - Background: Optional light color based on widget type
  - Typography: H4 (1.25rem/20px, Poppins Medium)
  - Action buttons: Text buttons or icon buttons
- **Padding:** 16px (adjusts responsively)

#### Modal
- **Background:** Pure White (#FFFFFF)
- **Border:** None
- **Shadow:** 0px 8px 24px rgba(0, 0, 0, 0.12)
- **Shape:** 16px border radius
- **Header:**
  - Typography: H3 (1.5rem/24px, Poppins Medium)
  - Close button: Icon button (X)
- **Padding:** 24px (adjusts responsively)
- **Overlay:** Semi-transparent black (rgba(0, 0, 0, 0.5))

## Icons

### Icon System
- **Primary Library:** Lucide Icons (outline style)
- **Default Size:** 24px × 24px (adjusts based on context)
- **Default Color:** Neutral-700 (#4D4D4D)
- **Active/Selected Color:** IntelliBlue (#005FAD)
- **Semantic Colors:**
  - Success: Success Green (#2E8B57)
  - Warning: Warning Orange (#FFA500)
  - Error: Error Red (#DC143C)

### Icon Usage
- **Navigation Icons:** Used in navigation bars, menus, and tabs
- **Action Icons:** Used for interactive elements (edit, delete, add, etc.)
- **Status Icons:** Used to indicate status (success, warning, error)
- **Functional Icons:** Used to represent features or functions

### Icon + Text Combinations
- **Alignment:** Icons should be center-aligned with text
- **Spacing:** 8px between icon and text
- **Typography:** Matches the text style of the accompanying text

## Spacing System

### Base Unit
- **4px** as the base unit for the spacing system

### Spacing Scale
- **4px (0.25rem):** Micro spacing (between related elements)
- **8px (0.5rem):** Extra small spacing (between closely related elements)
- **12px (0.75rem):** Small spacing (internal padding for compact elements)
- **16px (1rem):** Base spacing (standard spacing between elements)
- **24px (1.5rem):** Medium spacing (section padding, card padding)
- **32px (2rem):** Large spacing (between major sections)
- **48px (3rem):** Extra large spacing (between major content blocks)
- **64px (4rem):** Huge spacing (page margins on larger screens)

### Component Spacing
- **Form Groups:** 24px (1.5rem) between groups
- **Form Elements:** 16px (1rem) between label and input
- **Button Groups:** 16px (1rem) between buttons
- **Card Content:** 16px (1rem) between elements inside cards
- **Section Spacing:** 32px (2rem) between major sections
- **Page Margins:**
  - Mobile: 16px (1rem)
  - Tablet: 24px (1.5rem)
  - Desktop: 32px-64px (2rem-4rem)

## Layout Grid

### Breakpoints
- **Mobile:** 0-599px
- **Tablet:** 600-1023px
- **Desktop:** 1024px and above

### Container Widths
- **Mobile:** 100% with 16px margins
- **Tablet:** 100% with 24px margins
- **Desktop Small:** 1024px max-width with auto margins
- **Desktop Large:** 1280px max-width with auto margins

### Grid System
- **Columns:**
  - Mobile: 4 columns
  - Tablet: 8 columns
  - Desktop: 12 columns
- **Gutters:**
  - Mobile: 16px
  - Tablet: 24px
  - Desktop: 24px

## Motion & Animation

### Principles
- **Purposeful:** Animations should serve a purpose, not just decorate
- **Subtle:** Animations should be subtle and not distract from the content
- **Responsive:** Animations should respond to user actions
- **Consistent:** Animations should be consistent throughout the application

### Timing
- **Quick Transitions:** 150-200ms (button states, hover effects)
- **Standard Transitions:** 250-300ms (page transitions, modals)
- **Complex Animations:** 400-500ms (data visualizations, onboarding)

### Easing
- **Standard Easing:** ease-out (0.25, 0.1, 0.25, 1)
- **Entrance Easing:** ease-out (0, 0, 0.2, 1)
- **Exit Easing:** ease-in (0.4, 0, 1, 1)

### Common Animations
- **Button Feedback:** Subtle scale transform (0.98) on press
- **Page Transitions:** Fade in/out with slight vertical movement
- **Modal Entrance:** Fade in with slight scale up from 0.95 to 1
- **Modal Exit:** Fade out with slight scale down from 1 to 0.95
- **Toast Notifications:** Slide in from top or bottom with fade
- **Loading States:** Subtle pulse or shimmer effect

## Data Visualization

### Chart Colors
- **Primary Data:** IntelliBlue (#005FAD)
- **Secondary Data:** IntelliTeal (#00A99D)
- **Tertiary Data:** IntelliSky (#87CEEB)
- **Accent Data:** IntelliSun (#FFB81C)
- **Income/Positive:** Success Green (#2E8B57)
- **Expenses/Negative:** Error Red (#DC143C)

### Chart Typography
- **Chart Titles:** H4 (1.25rem/20px, Poppins Medium)
- **Axis Labels:** Body Small (0.875rem/14px, Inter Regular)
- **Data Labels:** Body Small (0.875rem/14px, Inter Medium)
- **Legends:** Body Small (0.875rem/14px, Inter Regular)

### Chart Elements
- **Grid Lines:** Neutral-300 (#E6E6E6), 1px dashed
- **Axis Lines:** Neutral-500 (#CCCCCC), 1px solid
- **Tooltips:** Dark background with white text, 8px border radius

## Accessibility Considerations

### Color Contrast
- **Text on Background:** Minimum 4.5:1 contrast ratio for normal text, 3:1 for large text
- **UI Components:** Minimum 3:1 contrast ratio for interactive elements

### Focus States
- **Keyboard Focus:** All interactive elements should have a visible focus state
- **Focus Indicators:** 2-3px outline in IntelliBlue (#005FAD)

### Text Sizing
- **Minimum Text Size:** 14px (0.875rem) for body text
- **Line Height:** Minimum 1.5 for body text

### Screen Reader Support
- **Semantic HTML:** Use proper HTML elements for their intended purpose
- **ARIA Attributes:** Use ARIA attributes when necessary
- **Alternative Text:** Provide alt text for all images and icons

## Implementation Notes

### CSS Variables
All colors, typography, spacing, and other design tokens should be implemented as CSS variables for easy maintenance and consistency.

```css
:root {
  /* Primary Colors */
  --color-primary: #005FAD;
  --color-white: #FFFFFF;
  
  /* Secondary Colors */
  --color-secondary-teal: #00A99D;
  --color-secondary-sky: #87CEEB;
  
  /* Accent Colors */
  --color-accent-sun: #FFB81C;
  --color-accent-copper: #B87333;
  
  /* Neutrals */
  --color-neutral-900: #1A1A1A;
  --color-neutral-700: #4D4D4D;
  --color-neutral-500: #CCCCCC;
  --color-neutral-300: #E6E6E6;
  --color-neutral-100: #F5F5F5;
  
  /* Semantic */
  --color-semantic-success: #2E8B57;
  --color-semantic-warning: #FFA500;
  --color-semantic-error: #DC143C;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Typography */
  --font-family-heading: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-family-body: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0px 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0px 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0px 8px 24px rgba(0, 0, 0, 0.12);
  
  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 250ms ease-out;
  --transition-slow: 400ms ease-out;
}
```

### Responsive Design
- Use mobile-first approach for all components and layouts
- Test on various device sizes and orientations
- Ensure touch targets are at least 44px × 44px on mobile
- Adjust spacing and typography based on screen size

### Performance
- Optimize images and icons
- Use system fonts as fallbacks
- Minimize CSS and JavaScript
- Implement lazy loading for images and components
- Consider reduced motion preferences

## Tone of Voice

All user-facing text should be:
- **Helpful & Encouraging:** Position IntelliFin as a partner
- **Clear & Concise:** Avoid jargon and be direct
- **Approachable:** Sound like a friendly local companion, not a stiff corporation
- **Positive:** Focus on solutions and benefits
- **Professional:** Maintain credibility and trustworthiness

## Example Applications

### Dashboard
- **Background:** Neutral-100 (#F5F5F5)
- **Cards:** Standard Card style with appropriate spacing
- **Data Visualization:** Charts using the defined color palette
- **Navigation:** Left sidebar on desktop, bottom bar on mobile

### Invoice Creation
- **Form Layout:** Clear grouping with appropriate spacing
- **Input Fields:** Text Input style with proper validation
- **Action Buttons:** Primary Button for submit, Secondary Button for save as draft
- **Preview:** Card-based preview of the invoice

### Financial Reports
- **Filters:** Dropdown/Select components for date ranges and categories
- **Data Tables:** Clean, well-spaced tables with appropriate typography
- **Export Options:** Text Buttons for different export formats
- **Visualizations:** Charts using the defined color palette and typography
