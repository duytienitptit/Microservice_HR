from app.pipeline.info_extractor import extract_email, extract_name

def test_extract_email():
    text = "John Doe\nEmail: john.doe@example.com\nPhone: 123456"
    assert extract_email(text) == "john.doe@example.com"
    
    text_no_email = "John Doe\nPhone: 123456"
    assert extract_email(text_no_email) is None
    
    text_multiple = "First: test1@example.co.uk and second: test2@gmail.com"
    assert extract_email(text_multiple) == "test1@example.co.uk"

def test_extract_name_explicit_label():
    text = "Họ và tên: Nguyễn Văn A\nEmail: nguyen@example.com"
    assert extract_name(text) == "Nguyễn Văn A"
    
    text2 = "Full Name: Tran Thi B\nEmail: tran@example.com"
    assert extract_name(text2) == "Tran Thi B"

def test_extract_name_heuristic():
    text = "Nguyễn Văn A\nEmail: nguyen@example.com\nSoftware Engineer"
    assert extract_name(text) == "Nguyễn Văn A"
    
    text_en = "John Doe\nEmail: john.doe@example.com\nWeb Developer"
    assert extract_name(text_en) == "John Doe"

def test_extract_name_skip_keywords():
    text = "CURRICULUM VITAE\nJohn Doe\nEmail: john.doe@example.com"
    # Should skip "CURRICULUM VITAE" and pick "John Doe"
    assert extract_name(text) == "John Doe"
