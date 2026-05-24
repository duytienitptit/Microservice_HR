import os

def compile_report():
    report_dir = "/Users/admin/01_Projects/Microservice/report"
    output_file = os.path.join(report_dir, "project_report.html")

    # Read the markdown files
    files_to_merge = [
        "step1_architecture.md",
        "step2_ai_rag.md",
        "step3_security_monitoring.md",
        "step4_deployment.md"
    ]

    merged_markdown = ""
    for filename in files_to_merge:
        filepath = os.path.join(report_dir, filename)
        if not os.path.exists(filepath):
            print(f"Error: {filepath} does not exist.")
            return False

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            merged_markdown += content + "\n\n---\n\n"

    # Escape the closing script tag to prevent breaking the HTML container script
    safe_markdown = merged_markdown.replace("</script>", "<\\/script>")

    html_template = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Kỹ Thuật Dự Án - AI HR Recruiter</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Highlight.js VS Light Theme for Code Highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
    
    <!-- CDNs for JS parsers -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    
    <!-- Additional languages for Highlight.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/nginx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/yaml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/sql.min.js"></script>
    
    <!-- Mermaid.js for Dynamic Diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js"></script>
    
    <style>
        :root {
            --primary: #2563eb;
            --primary-gradient: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            --primary-light: #eff6ff;
            --primary-border: #bfdbfe;
            --success: #16a34a;
            --success-light: #f0fdf4;
            --success-border: #bbf7d0;
            --warning: #ea580c;
            --warning-light: #fff7ed;
            --warning-border: #fed7aa;
            --danger: #dc2626;
            --danger-light: #fef2f2;
            --danger-border: #fca5a5;
            
            --bg-body: #f8fafc;
            --bg-sidebar: #ffffff;
            --bg-card: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --text-white: #ffffff;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --font-main: 'Inter', sans-serif;
            --font-heading: 'Outfit', sans-serif;
            --font-mono: 'Fira Code', monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-main);
            color: var(--text-main);
            background-color: var(--bg-body);
            line-height: 1.7;
            display: flex;
            min-height: 100vh;
        }

        /* ─── SIDEBAR STYLE ────────────────────────────────── */
        .sidebar {
            width: 320px;
            background-color: var(--bg-sidebar);
            border-right: 1px solid var(--border-color);
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            z-index: 100;
        }

        .sidebar-header {
            padding: 24px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-sidebar);
        }

        .sidebar-brand {
            font-family: var(--font-heading);
            font-size: 1.5rem;
            font-weight: 800;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sidebar-subtitle {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-top: 4px;
            font-weight: 600;
        }

        .sidebar-menu {
            flex: 1;
            overflow-y: auto;
            padding: 20px 16px;
        }

        .toc-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .toc-item {
            width: 100%;
        }

        .toc-link {
            display: block;
            padding: 8px 12px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            border-radius: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .toc-link:hover {
            background-color: var(--primary-light);
            color: var(--primary);
            padding-left: 16px;
        }

        .toc-link.active {
            background-color: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
            border-left: 3px solid var(--primary);
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }

        .toc-link.level-1 {
            font-family: var(--font-heading);
            font-size: 0.95rem;
            font-weight: 600;
            margin-top: 10px;
            color: #0f172a;
        }

        .toc-link.level-2 {
            padding-left: 20px;
        }
        
        .toc-link.level-2:hover {
            padding-left: 24px;
        }

        .toc-link.level-3 {
            padding-left: 32px;
            font-size: 0.8rem;
            color: #64748b;
        }

        .toc-link.level-3:hover {
            padding-left: 36px;
        }

        /* ─── MAIN CONTENT STYLE ───────────────────────────── */
        .main-wrapper {
            margin-left: 320px;
            flex: 1;
            padding: 40px;
            display: flex;
            justify-content: center;
        }

        .container {
            max-width: 900px;
            width: 100%;
            background-color: var(--bg-card);
            padding: 60px;
            border-radius: 16px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border-color);
        }

        /* ─── MARKDOWN RENDER STYLING ─────────────────────── */
        #content {
            font-size: 1.05rem;
            color: #334155;
        }

        #content h1 {
            font-family: var(--font-heading);
            font-size: 2.05rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 40px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
            line-height: 1.25;
            scroll-margin-top: 80px;
        }

        #content h1:first-child {
            margin-top: 0;
        }

        #content h2 {
            font-family: var(--font-heading);
            font-size: 1.45rem;
            font-weight: 700;
            color: #0f172a;
            margin-top: 30px;
            margin-bottom: 16px;
            line-height: 1.3;
            scroll-margin-top: 80px;
        }

        #content h3 {
            font-family: var(--font-heading);
            font-size: 1.15rem;
            font-weight: 600;
            color: #1e293b;
            margin-top: 24px;
            margin-bottom: 12px;
            scroll-margin-top: 80px;
        }

        #content p {
            margin-bottom: 20px;
        }

        #content strong {
            color: #0f172a;
            font-weight: 600;
        }

        #content a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            border-bottom: 1px dashed var(--primary);
            transition: all 0.2s ease;
        }

        #content a:hover {
            color: #1d4ed8;
            border-bottom-style: solid;
        }

        #content ul, #content ol {
            margin-bottom: 20px;
            padding-left: 24px;
        }

        #content li {
            margin-bottom: 8px;
        }

        /* Code Blocks */
        #content pre {
            position: relative;
            background-color: #0f172a !important; /* Forces dark bg for code */
            color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            overflow-x: auto;
            border: 1px solid #1e293b;
        }

        #content code {
            font-family: var(--font-mono);
            font-size: 0.9rem;
            padding: 2px 6px;
            background-color: #f1f5f9;
            color: #0f172a;
            border-radius: 4px;
        }

        #content pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
            border-radius: 0;
            display: block;
            line-height: 1.5;
        }

        /* Alert blockquotes based on GitHub styled alerts */
        #content blockquote {
            margin: 20px 0;
            padding: 16px 20px;
            border-left: 4px solid var(--border-color);
            background-color: #f8fafc;
            border-radius: 0 8px 8px 0;
        }

        /* Custom styling for specific GitHub callouts */
        #content blockquote > p:first-child {
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: var(--font-heading);
            font-size: 0.95rem;
        }

        #content blockquote.alert-note {
            border-left-color: var(--primary);
            background-color: var(--primary-light);
        }
        #content blockquote.alert-note > p:first-child {
            color: var(--primary);
        }

        #content blockquote.alert-tip {
            border-left-color: var(--success);
            background-color: var(--success-light);
        }
        #content blockquote.alert-tip > p:first-child {
            color: var(--success);
        }

        #content blockquote.alert-warning {
            border-left-color: var(--warning);
            background-color: var(--warning-light);
        }
        #content blockquote.alert-warning > p:first-child {
            color: var(--warning);
        }

        #content blockquote.alert-important {
            border-left-color: #8b5cf6;
            background-color: #f5f3ff;
        }
        #content blockquote.alert-important > p:first-child {
            color: #7c3aed;
        }

        /* Tables */
        #content table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 0.95rem;
        }

        #content th, #content td {
            padding: 12px 16px;
            border: 1px solid var(--border-color);
            text-align: left;
        }

        #content th {
            background-color: #f1f5f9;
            font-family: var(--font-heading);
            font-weight: 600;
            color: #0f172a;
        }

        #content tr:nth-child(even) {
            background-color: #f8fafc;
        }

        #content hr {
            border: 0;
            height: 1px;
            background-color: var(--border-color);
            margin: 40px 0;
        }

        /* Copy Button for Code Blocks */
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #1e293b;
            padding: 8px 16px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: #94a3b8;
            border-bottom: 1px solid #334155;
        }

        .code-header + pre {
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
        }

        .btn-copy {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            font-size: 0.75rem;
        }

        .btn-copy:hover {
            color: #f8fafc;
            background-color: #334155;
        }

        /* Back to top button */
        .btn-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 44px;
            height: 44px;
            background: var(--primary-gradient);
            color: white;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: var(--shadow-md);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 99;
        }

        .btn-top.show {
            opacity: 1;
            visibility: visible;
        }

        .btn-top:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
        }

        /* Mermaid Wrapper */
        .mermaid {
            background: #ffffff;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            margin: 20px 0;
            display: flex;
            justify-content: center;
        }

        /* Responsive Layout */
        @media (max-width: 1024px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }

            .sidebar.active {
                transform: translateX(0);
            }

            .main-wrapper {
                margin-left: 0;
                padding: 20px;
            }

            .container {
                padding: 30px;
            }
            
            .toggle-sidebar-btn {
                display: flex !important;
            }
        }

        .toggle-sidebar-btn {
            position: fixed;
            top: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            background-color: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 110;
            box-shadow: var(--shadow-sm);
        }
    </style>
</head>
<body>

    <button class="toggle-sidebar-btn" id="toggle-sidebar" aria-label="Toggle Navigation Menu">
        <i class="fa-solid fa-bars"></i>
    </button>

    <!-- SIDEBAR -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="sidebar-brand">
                <i class="fa-solid fa-robot"></i> AI HR Recruiter
            </div>
            <div class="sidebar-subtitle">Báo Cáo Dự Án Kỹ Thuật</div>
        </div>
        <div class="sidebar-menu">
            <nav id="toc">
                <ul class="toc-list" id="toc-list">
                    <!-- TOC elements generated dynamically -->
                </ul>
            </nav>
        </div>
    </div>

    <!-- MAIN READING CONTAINER -->
    <div class="main-wrapper">
        <div class="container">
            <div id="content">
                <!-- Markdown renders here -->
                <div style="text-align: center; padding: 40px;">
                    <i class="fa-solid fa-spinner fa-spin fa-3x" style="color: var(--primary);"></i>
                    <p style="margin-top: 20px; font-weight: 500;">Đang chuẩn bị báo cáo kỹ thuật...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- BACK TO TOP BUTTON -->
    <button class="btn-top" id="btn-top" aria-label="Scroll back to top">
        <i class="fa-solid fa-arrow-up"></i>
    </button>

    <!-- RAW MARKDOWN SOURCE (Embedded safely) -->
    <script type="text/markdown" id="markdown-source">__MARKDOWN_CONTENT__</script>

    <script>
        // Initialize Mermaid
        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'default',
            securityLevel: 'loose',
            flowchart: { htmlLabels: true, useMaxWidth: true }
        });

        // Custom Renderer to style blockquotes based on GitHub alerts
        const renderer = new marked.Renderer();
        
        // Custom blockquote parser for Github Alerts: [!NOTE], [!TIP], [!WARNING], [!IMPORTANT]
        renderer.blockquote = function(quote) {
            let type = '';
            let icon = '';
            let title = '';

            if (quote.includes('[!NOTE]')) {
                type = 'alert-note';
                icon = 'fa-circle-info';
                title = 'NOTE';
                quote = quote.replace(/\[!NOTE\]\s*<br\s*\/?>?\s*|\s*\[!NOTE\]\s*/g, '');
            } else if (quote.includes('[!TIP]')) {
                type = 'alert-tip';
                icon = 'fa-lightbulb';
                title = 'TIP';
                quote = quote.replace(/\[!TIP\]\s*<br\s*\/?>?\s*|\s*\[!TIP\]\s*/g, '');
            } else if (quote.includes('[!WARNING]')) {
                type = 'alert-warning';
                icon = 'fa-triangle-exclamation';
                title = 'WARNING';
                quote = quote.replace(/\[!WARNING\]\s*<br\s*\/?>?\s*|\s*\[!WARNING\]\s*/g, '');
            } else if (quote.includes('[!IMPORTANT]')) {
                type = 'alert-important';
                icon = 'fa-circle-exclamation';
                title = 'IMPORTANT';
                quote = quote.replace(/\[!IMPORTANT\]\s*<br\s*\/?>?\s*|\s*\[!IMPORTANT\]\s*/g, '');
            }

            if (type) {
                return `<blockquote class="${type}">
                    <p><i class="fa-solid ${icon}"></i> ${title}</p>
                    ${quote}
                </blockquote>`;
            }
            return `<blockquote>${quote}</blockquote>`;
        };

        // Custom code block renderer to add code header with language and Copy button
        renderer.code = function(token, language) {
            const codeText = typeof token === 'object' ? token.text : token;
            const lang = (typeof token === 'object' ? token.lang : language) || 'text';

            if (lang === 'mermaid') {
                return `<pre class="mermaid">${codeText}</pre>`;
            }
            
            const escapedCode = codeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            return `
                <div class="code-wrapper">
                    <div class="code-header">
                        <span><i class="fa-solid fa-code"></i> ${lang.toUpperCase()}</span>
                        <button class="btn-copy" onclick="copyCode(this)"><i class="fa-regular fa-copy"></i> Copy</button>
                    </div>
                    <pre><code class="language-${lang}">${escapedCode}</code></pre>
                </div>
            `;
        };

        // Configure Marked options
        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            headerIds: true,
            mangle: false
        });

        // Compile Markdown and Render Content
        document.addEventListener('DOMContentLoaded', async () => {
            const markdownSource = document.getElementById('markdown-source').text;
            const contentDiv = document.getElementById('content');
            
            // 1. Render Markdown to HTML
            contentDiv.innerHTML = marked.parse(markdownSource);
            
            // 2. Syntax Highlight
            hljs.highlightAll();
            
            // 3. Render Mermaid Diagrams
            try {
                await mermaid.run();
            } catch (err) {
                console.error("Mermaid rendering error: ", err);
            }

            // 4. Generate Table of Contents (TOC)
            buildTOC();
            
            // 5. Setup Scroll spy & UI listeners
            setupScrollSpy();
            setupUIListeners();
        });

        // Copy Code to Clipboard Function
        function copyCode(btn) {
            const codeEl = btn.closest('.code-wrapper').querySelector('pre code');
            const text = codeEl.innerText;
            navigator.clipboard.writeText(text).then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--success);"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }

        // Dynamic TOC Builder
        function buildTOC() {
            const tocList = document.getElementById('toc-list');
            tocList.innerHTML = '';
            
            // Select H1 and H2 inside Content
            const headers = document.querySelectorAll('#content h1, #content h2, #content h3');
            
            headers.forEach((header, index) => {
                const text = header.innerText.replace(/[\\u2705\\u274c]/g, '').trim(); // strip status emoji
                const tag = header.tagName.toLowerCase();
                
                // Ensure heading has an ID
                let id = header.id;
                if (!id) {
                    id = text.toLowerCase()
                              .replace(/[^a-zA-Z0-9\\sđđáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/g, '')
                              .replace(/\\s+/g, '-');
                    header.id = id;
                }
                
                const li = document.createElement('li');
                li.className = 'toc-item';
                
                const a = document.createElement('a');
                a.href = `#${id}`;
                a.className = `toc-link level-${tag === 'h1' ? '1' : tag === 'h2' ? '2' : '3'}`;
                a.innerText = text;
                
                li.appendChild(a);
                tocList.appendChild(li);
            });
        }

        // Scroll Spy Function to highlight active menu item on scroll
        function setupScrollSpy() {
            const sections = document.querySelectorAll('#content h1, #content h2');
            const tocLinks = document.querySelectorAll('.toc-link');
            
            window.addEventListener('scroll', () => {
                let current = '';
                const scrollPos = window.scrollY + 100;
                
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    if (scrollPos >= sectionTop) {
                        current = section.getAttribute('id');
                    }
                });
                
                tocLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${current}`) {
                        link.classList.add('active');
                        // Auto-scroll TOC to keep active link in view
                        link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            });
        }

        // UI Event Listeners
        function setupUIListeners() {
            // Sidebar Toggle on Mobile
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('toggle-sidebar');
            
            toggleBtn.addEventListener('click', (e) => {
                sidebar.classList.toggle('active');
                e.stopPropagation();
            });
            
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && e.target !== toggleBtn) {
                    sidebar.classList.remove('active');
                }
            });
            
            // Back to top button visibility
            const btnTop = document.getElementById('btn-top');
            window.addEventListener('scroll', () => {
                if (window.scrollY > 400) {
                    btnTop.classList.add('show');
                } else {
                    btnTop.classList.remove('show');
                }
            });
            
            btnTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Smooth scrolling for anchor links
            document.querySelectorAll('.toc-link').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetEl = document.getElementById(targetId);
                    
                    if (targetEl) {
                        // Scroll to element
                        window.scrollTo({
                            top: targetEl.offsetTop - 60,
                            behavior: 'smooth'
                        });
                        
                        // Close sidebar on mobile
                        if (window.innerWidth <= 1024) {
                            sidebar.classList.remove('active');
                        }
                    }
                });
            });
        }
    </script>
</body>
</html>
"""

    # Embed markdown directly into template
    compiled_html = html_template.replace("__MARKDOWN_CONTENT__", safe_markdown)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(compiled_html)

    print(f"Successfully compiled report to {output_file}")
    return True

if __name__ == "__main__":
    compile_report()
