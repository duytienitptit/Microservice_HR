---
name: project-reporting
description: Guides the compilation, structuring, and error-free rendering of detailed project technical reports. Use this skill when compiling multiple markdown documentation chapters into a unified, high-fidelity, self-contained HTML report with dynamic sidebar navigation, Mermaid diagram rendering, and custom alert styling.
---

# Project Reporting & HTML Compilation

This skill guides the process of creating, structuring, and compiling project technical reports into high-fidelity, responsive HTML documents. It ensures that complex documentations are split logically during drafting and integrated smoothly into a single, clean, bug-free interactive page.

## Workflow

### 1. Document Structuring (Drafting Phase)
* **Directory:** Save all draft markdown chapters in a dedicated `/report/` folder (e.g., `step1_architecture.md`, `step2_ai_rag.md`, etc.).
* **Granularity:** Break the report down into separate files to maintain focus, prevent huge file conflicts, and make editing manageable.
* **Format Guidelines:**
  - Use standard markdown.
  - Utilize **Mermaid.js** code blocks (` ```mermaid `) for system architecture, data models, sequence flows, and workflow diagrams.
  - Use GitHub-style alert blockquotes to highlight warnings, tips, notes, or critical requirements:
    ```markdown
    > [!NOTE]
    > Helpful explanation or background context.
    
    > [!TIP]
    > Performance optimizations or best practices.
    
    > [!WARNING]
    > Crucial warnings or potential pitfalls.
    
    > [!IMPORTANT]
    > Essential steps or absolute constraints.
    ```

### 2. Compilation Strategy (HTML Building)
Use a python compilation script (e.g., `compile_report.py`) to automate merging the markdown chapters and injection into a HTML shell.
* **File Order:** Merge files in logical order (e.g., Architecture first, followed by Core Logic, Security/Monitoring, and Deployment/Operations).
* **Escape Scripts:** When embedding markdown content directly into the HTML's `<script type="text/markdown">` tag, replace `</script>` in the markdown text with `<\/script>` to prevent the browser parser from terminating the container script prematurely:
  ```python
  safe_markdown = merged_markdown.replace("</script>", "<\/script>")
  ```

---

## ⚠️ Critical Bug Prevention (Common Pitfalls & Fixes)

When writing or modifying JavaScript inside the HTML report template, strictly adhere to these rules to avoid breaking page load (Loading Spinner freezes):

### 1. Avoid JavaScript Syntax Errors in Object Literals (e.g., Mermaid configs)
* **Mistake:** Setting percentage values directly as unquoted numbers inside configuration objects.
  ```javascript
  // ❌ INVALID - Throws: Uncaught SyntaxError: Unexpected token '}'
  flowchart: { htmlLabels: true, useWidth: 100% }
  ```
* **Correct:** Use Boolean or string values for sizing, or use `useMaxWidth`.
  ```javascript
  //  VALID
  flowchart: { htmlLabels: true, useMaxWidth: true }
  ```

### 2. Ensure Marked.js Version Compatibility (Token vs. String)
* **Mistake:** Accessing `.replace()` or string operations directly on the first parameter of the `renderer.code` hook.
  ```javascript
  // ❌ INVALID (Will fail in newer Marked.js versions where 'code' is a token object)
  renderer.code = function(code, language) {
      return code.replace(/&/g, '&amp;'); 
  }
  ```
* **Correct:** Check the type of the parameter and handle both object tokens and plain strings:
  ```javascript
  //  VALID
  renderer.code = function(token, language) {
      const codeText = typeof token === 'object' ? token.text : token;
      const lang = (typeof token === 'object' ? token.lang : language) || 'text';
      
      if (lang === 'mermaid') {
          return `<pre class="mermaid">${codeText}</pre>`;
      }
      
      const escapedCode = codeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // Return wrapper HTML...
  };
  ```

---

## 🎨 Visual & Interactive Design Standards

A high-quality technical report must feel premium and interactive. Implement these features in the HTML template:

1. **Modern Typography:** Load **Inter** (body), **Outfit** (headings), and **Fira Code** (monospaced code blocks) from Google Fonts.
2. **Dynamic Table of Contents (TOC):** Parse all `H1`, `H2`, and `H3` headers inside the content container dynamically and generate links in a sticky sidebar.
3. **Scroll Spy:** Track the user's scroll position and automatically apply the `.active` class to the corresponding sidebar navigation link.
4. **Copy Code Button:** Wrap code blocks with a header displaying the language name and a "Copy" button. Provide visual feedback (e.g., "Copied!" for 2 seconds) upon success.
5. **Custom Alerts:** Map GitHub-style blockquotes (`[!NOTE]`, `[!TIP]`, etc.) to beautiful CSS classes with left borders (e.g., blue for note, green for tip, orange for warning, purple for important) and Font Awesome icons.
