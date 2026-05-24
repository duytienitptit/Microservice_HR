import os
import pdfplumber

def make_pdf(filename, name, email):
    # Minimal PDF file content
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n"
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"5 0 obj\n<< /Length 100 >>\nstream\n"
        b"BT\n/F1 12 Tf\n50 700 Td\n(Full Name: " + name.encode('utf-8') + b") Tj\n"
        b"0 -20 Td\n(Email: " + email.encode('utf-8') + b") Tj\n"
        b"0 -20 Td\n(Python Software Engineer with 5 years experience) Tj\nET\n"
        b"endstream\nendobj\nxref\n0 6\n"
        b"0000000000 65535 f\n"
        b"0000000009 00000 n\n"
        b"0000000056 00000 n\n"
        b"0000000111 00000 n\n"
        b"0000000212 00000 n\n"
        b"0000000282 00000 n\n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n433\n%%EOF\n"
    )
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(pdf_content)

if __name__ == '__main__':
    pdf_path = '/Users/admin/01_Projects/Microservice/scratch/test_resume.pdf'
    make_pdf(pdf_path, 'Alice Smith', 'alice.smith@example.com')
    print("PDF created.")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print("PDF Pages:", len(pdf.pages))
            for page in pdf.pages:
                print("Extracted Text:")
                print(page.extract_text())
    except Exception as e:
        print("Error reading PDF:", e)
