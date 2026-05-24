import os
import json
import time
import uuid
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "https://localhost"

def make_pdf(filename, name, email):
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

def encode_multipart_formdata(fields, files):
    boundary = b'----WebKitFormBoundaryE2ETestBoundary'
    lines = []
    for name, value in fields.items():
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode('utf-8'))
        lines.append(b'')
        lines.append(str(value).encode('utf-8'))
    for name, filepath in files.items():
        filename = os.path.basename(filepath)
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode('utf-8'))
        lines.append(b'Content-Type: application/pdf')
        lines.append(b'')
        with open(filepath, 'rb') as f:
            lines.append(f.read())
    lines.append(b'--' + boundary + b'--')
    lines.append(b'')
    body = b'\r\n'.join(lines)
    content_type = f'multipart/form-data; boundary={boundary.decode("utf-8")}'
    return content_type, body

def send_request(path, method="GET", data=None, headers=None, content_type="application/json"):
    url = f"{BASE_URL}{path}"
    
    if headers is None:
        headers = {}
    
    # Correlation ID propagation
    corr_id = str(uuid.uuid4())
    headers["X-Correlation-ID"] = corr_id
    
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data
            headers["Content-Type"] = content_type

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    import ssl
    context = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body), response.status
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(res_body)
            return err_json, e.code
        except Exception:
            return {"error": res_body}, e.code

def run_e2e():
    print("=" * 60)
    print("STARTING E2E INTEGRATION TEST")
    print("=" * 60)

    # 0. Create Test PDF
    pdf_path = "/Users/admin/01_Projects/Microservice/scratch/alice_smith_resume.pdf"
    make_pdf(pdf_path, "Alice Smith", "alice.smith.e2e@example.com")
    print(f"[0] Created mock PDF resume at {pdf_path}")

    # Generate unique emails to avoid conflicts
    unique_suffix = str(uuid.uuid4())[:8]
    hr_email = f"hr_{unique_suffix}@example.com"
    hr_password = "Password123!"

    # 1. HR Register
    print(f"\n[1] Registering HR: {hr_email}...")
    register_payload = {
        "email": hr_email,
        "password": hr_password,
        "fullName": "HR E2E Recruiter",
        "role": "HR"
    }
    res, status = send_request("/api/auth/register", "POST", register_payload)
    if status != 201:
        print(f"FAILED: HR Registration failed with status {status}. Response: {res}")
        return False
    print(f"SUCCESS: HR Registered. Response payload: {res.get('success')}")

    # 2. HR Login
    print("\n[2] Logging in HR...")
    login_payload = {
        "email": hr_email,
        "password": hr_password
    }
    res, status = send_request("/api/auth/login", "POST", login_payload)
    if status != 200:
        print(f"FAILED: HR Login failed with status {status}. Response: {res}")
        return False
    
    access_token = res["data"]["accessToken"]
    auth_headers = {"Authorization": f"Bearer {access_token}"}
    print(f"SUCCESS: Logged in. Token retrieved: {access_token[:20]}...")

    # 3. Create Job
    print("\n[3] Creating job posting...")
    job_payload = {
        "title": f"Python Engineer - {unique_suffix}",
        "description": "Backend engineer using FastAPI and Docker.",
        "requirements": "Python, FastAPI, Postgres, RabbitMQ"
    }
    res, status = send_request("/api/jobs/", "POST", job_payload, auth_headers)
    if status != 201:
        print(f"FAILED: Job creation failed with status {status}. Response: {res}")
        return False
    
    job_id = res["data"]["job"]["id"]
    print(f"SUCCESS: Job created with ID: {job_id}")

    # 4. Upload CV
    print("\n[4] Uploading CV...")
    fields = {"job_id": job_id}
    files = {"cv": pdf_path}
    content_type, body = encode_multipart_formdata(fields, files)
    
    res, status = send_request("/api/applications/", "POST", body, auth_headers, content_type)
    if status != 201:
        print(f"FAILED: CV upload failed with status {status}. Response: {res}")
        return False
    
    application_id = res["data"]["application"]["id"]
    print(f"SUCCESS: CV uploaded. Application ID: {application_id}")

    # 5. Wait for CV Processing (polling database until status is READY_FOR_INTERVIEW)
    print("\n[5] Waiting for CV extraction & status change...")
    status_ready = False
    for i in range(45):
        time.sleep(2)
        res, status = send_request(f"/api/applications/{application_id}", "GET", headers=auth_headers)
        if status != 200:
            print(f"Error fetching application: {res}")
            continue
        
        current_status = res["data"]["application"]["status"]
        print(f"   Attempt {i+1}/45: Current Application Status = {current_status}")
        
        if current_status == "READY_FOR_INTERVIEW":
            status_ready = True
            break
        elif current_status in ["CV_PARSE_FAILED", "REJECTED"]:
            print(f"FAILED: Application transitioned to terminal error status: {current_status}")
            return False

    if not status_ready:
        print("FAILED: Timeout waiting for application to become READY_FOR_INTERVIEW.")
        return False
    
    # Check extracted data
    candidate_name = res["data"]["application"].get("candidateName")
    candidate_email = res["data"]["application"].get("candidateEmail")
    print(f"SUCCESS: Application is READY_FOR_INTERVIEW. Extracted Name={candidate_name}, Email={candidate_email}")

    # 6. Send Invite
    print(f"\n[6] Sending interview invitation to candidate...")
    res, status = send_request(f"/api/applications/{application_id}/invite", "POST", headers=auth_headers)
    if status != 200:
        print(f"FAILED: Send invite failed with status {status}. Response: {res}")
        return False
    
    # 7. Access Magic Link (Candidate Entry Point)
    # To get the magicLinkToken, we fetch the updated application
    res, status = send_request(f"/api/applications/{application_id}", "GET", headers=auth_headers)
    magic_token = res["data"]["application"].get("magicLinkToken")
    if not magic_token:
        print("FAILED: magicLinkToken not found in application data.")
        return False
    
    print(f"SUCCESS: Magic link generated. Token = {magic_token}")

    # 8. Start Interview Session (using magic link token)
    print(f"\n[7/8] Candidate accessing magic link token...")
    res, status = send_request(f"/api/interview/{magic_token}", "GET")
    if status != 200:
        print(f"FAILED: Magic link access failed with status {status}. Response: {res}")
        return False
    
    session_id = res["data"]["session"]["id"]
    greeting_msg = res["data"]["messages"][0]["content"]
    print(f"SUCCESS: Interview Session started with ID: {session_id}")
    print(f"   AI Greeting: {greeting_msg}")

    # 9. Interview Chat
    print("\n[9] Simulating chat conversation...")
    chat_turns = [
        "Hello! I am Alice. I'm a Backend Developer with 5 years experience.",
        "In my last role I built microservices using FastAPI, Python, Postgres, and Docker.",
        "My most challenging project was scaling a message-queue processing system with RabbitMQ."
    ]

    for idx, answer in enumerate(chat_turns):
        print(f"   Turn {idx+1}: Candidate says: '{answer}'")
        chat_payload = {"message": answer}
        res, status = send_request(f"/api/interviews/{session_id}/chat", "POST", chat_payload)
        if status != 200:
            print(f"FAILED: Chat request failed with status {status}. Response: {res}")
            return False
        
        ai_reply = res["data"]["ai_response"]["content"] if res["data"].get("ai_response") else "No reply (ended)"
        stage = res["data"]["session"]["current_stage"]
        print(f"   AI Reply: '{ai_reply}' (Stage: {stage})")

    # 10. End Interview Session
    print("\n[10] Manually ending interview session...")
    res, status = send_request(f"/api/interviews/{session_id}/end", "POST")
    if status != 200:
        print(f"FAILED: Ending session failed with status {status}. Response: {res}")
        return False
    print(f"SUCCESS: Session ended. Status = {res['data']['status']}")

    # 11. Wait for Assessment Generation (polling report API)
    print("\n[11] Waiting for assessment report generation...")
    report_ready = False
    for i in range(10):
        time.sleep(2)
        res, status = send_request(f"/api/reports/{application_id}", "GET", headers=auth_headers)
        if status == 200:
            report_ready = True
            break
        print(f"   Attempt {i+1}/10: Report not generated yet (status code {status})")

    if not report_ready:
        print("FAILED: Timeout waiting for assessment report to be generated.")
        return False

    print("SUCCESS: Assessment Report generated:")
    print(json.dumps(res, indent=2))
    
    # 12. Final Validation
    scores = res["data"]["report"]["scores"]
    print(f"\nFinal Scores: Overall={scores.get('overall')}, Tech={scores.get('technical')}, Comm={scores.get('communication')}")
    print("=" * 60)
    print("ALL E2E FLOW STEPS COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_e2e()
    exit(0 if success else 1)
