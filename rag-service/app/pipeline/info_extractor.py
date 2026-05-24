import re
from app.utils.logger import logger

# Compile email regex
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Labels regex
NAME_LABEL_REGEX = re.compile(
    r'(?:name|full\s+name|họ\s*(?:và)?\s*tên|ứng\s+viên)\s*[:|-]\s*([^\n]+)', 
    re.IGNORECASE
)

# Common resume headers/keywords to skip
SKIP_KEYWORDS = {
    "resume", "cv", "curriculum", "vitae", "contact", "profile", "summary", 
    "education", "experience", "skills", "github", "linkedin", "phone", "email",
    "address", "page", "developer", "engineer", "designer", "intern", "junior", "senior",
    "objective", "project", "projects", "languages", "interests", "certifications", "hobbies"
}

def extract_email(text: str) -> str | None:
    """
    Extracts the first email address found in the text.
    """
    match = EMAIL_REGEX.search(text)
    if match:
        return match.group(0).strip().lower()
    return None

def extract_name(text: str) -> str | None:
    """
    Extracts the candidate's name from CV text using heuristics and labels.
    """
    # 1. Try explicit labels first
    for match in NAME_LABEL_REGEX.finditer(text):
        candidate_name = match.group(1).strip()
        candidate_name = re.sub(r'[\r\n\t]+', ' ', candidate_name).strip()
        # Ensure it has word structure
        words = candidate_name.split()
        if 2 <= len(words) <= 5:
            return candidate_name

    # 2. Heuristic parsing of the top of the resume
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        cleaned_lines.append(cleaned)
        if len(cleaned_lines) >= 20:  # Only look at top 20 non-empty lines
            break

    for line in cleaned_lines:
        # Skip if contains email
        if EMAIL_REGEX.search(line):
            continue
        
        # Skip if contains links
        if "http" in line.lower() or "github.com" in line.lower() or "linkedin.com" in line.lower():
            continue
            
        # Skip if has digits
        if any(char.isdigit() for char in line):
            continue

        # Skip if word count doesn't match name structure
        words = line.split()
        if not words or len(words) < 2 or len(words) > 5:
            continue
            
        # Check if any word is in the skip keywords list
        has_skip_keyword = False
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word).lower()
            if clean_word in SKIP_KEYWORDS:
                has_skip_keyword = True
                break
        if has_skip_keyword:
            continue
            
        # Check title casing: standard name words are capitalized
        is_title_case = True
        for word in words:
            if word and not word[0].isupper():
                is_title_case = False
                break
                
        if is_title_case:
            cleaned_line = re.sub(r'[^\w\sà-ỹÀ-Ỹ]', '', line).strip()
            if 2 <= len(cleaned_line.split()) <= 5:
                return line

    return None
