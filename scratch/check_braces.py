with open("/Users/admin/01_Projects/Microservice/report/project_report.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Extract script block
script_content = ""
in_script = False
for line in lines:
    if "<script>" in line or "<script " in line:
        if 'type="text/markdown"' not in line:
            in_script = True
            continue
    if "</script>" in line and in_script:
        in_script = False
        break
    if in_script:
        script_content += line

# Print script content with line numbers relative to the script block
script_lines = script_content.splitlines()
for idx, line in enumerate(script_lines):
    print(f"{idx+1}: {line}")

# Count braces
stack = []
for idx, line in enumerate(script_lines):
    for char_idx, char in enumerate(line):
        if char == '{':
            stack.append((idx+1, char_idx+1))
        elif char == '}':
            if not stack:
                print(f"ERROR: Unmatched closing brace at line {idx+1}, col {char_idx+1}")
            else:
                stack.pop()

if stack:
    print("ERROR: Unmatched opening braces left at:")
    for line_num, col in stack:
        print(f"Line {line_num}, col {col}")
else:
    print("Braces match perfectly!")
