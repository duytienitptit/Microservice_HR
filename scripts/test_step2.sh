#!/bin/bash

# Exit on error
set -e

echo "=== 1. Đăng ký & Đăng nhập tài khoản HR ==="
UNIQUE_ID=$(date +%s)
HR_EMAIL="hr_test_${UNIQUE_ID}@example.com"
HR_PASSWORD="Password123"

# Register HR
curl -s -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$HR_EMAIL\",\"password\":\"$HR_PASSWORD\",\"fullName\":\"HR Test Tester\"}"

# Login HR
LOGIN_RES=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$HR_EMAIL\",\"password\":\"$HR_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$' | head -n 1)

if [ -z "$TOKEN" ]; then
  echo "Đăng nhập thất bại!"
  echo "Phản hồi đăng nhập: $LOGIN_RES"
  exit 1
fi
echo "Đăng nhập thành công, Token: ${TOKEN:0:15}..."

echo ""
echo "=== 2. Tạo một Job mới ==="
JOB_RES=$(curl -s -X POST http://localhost/api/jobs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Node.js Engineer","description":"Xây dựng hệ thống microservice","requirements":"Kinh nghiệm 2 năm"}')

JOB_ID=$(echo $JOB_RES | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -n 1)
echo "Tạo Job thành công, Job ID: $JOB_ID"

echo ""
echo "=== 3. Tạo file PDF giả lập để upload ==="
echo "Mock PDF Content" > mock_cv.pdf

echo ""
echo "=== 4. Upload CV ứng viên ==="
APP_RES=$(curl -s -X POST http://localhost/api/applications/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "job_id=$JOB_ID" \
  -F "cv=@mock_cv.pdf" \
  -F "candidate_name=Nguyen Van Test" \
  -F "candidate_email=candidate_test@example.com")

APP_ID=$(echo $APP_RES | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -n 1)
echo "Upload CV thành công, Application ID: $APP_ID"

# Get status
STATUS_RES=$(curl -s -X GET http://localhost/api/applications/$APP_ID \
  -H "Authorization: Bearer $TOKEN")
CURRENT_STATUS=$(echo $STATUS_RES | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -n 1)
echo "Trạng thái hiện tại: $CURRENT_STATUS"

echo ""
echo "=== 5. Gửi message CV_READY qua RabbitMQ Management HTTP API ==="
curl -s -u guest:guest -H "content-type:application/json" \
  -X POST http://localhost:15672/api/exchanges/%2f/cv.events/publish \
  -d "{\"properties\":{},\"routing_key\":\"cv.ready\",\"payload\":\"{\\\"application_id\\\":\\\"$APP_ID\\\",\\\"status\\\":\\\"success\\\",\\\"extracted_email\\\":\\\"candidate_extracted@example.com\\\",\\\"extracted_name\\\":\\\"Nguyen Van Extracted\\\",\\\"correlation_id\\\":\\\"test-corr-id\\\"}\",\"payload_encoding\":\"string\"}"

echo "Đã gửi message CV_READY."
sleep 2

echo ""
echo "=== 6. Kiểm tra lại trạng thái Application sau khi consume CV_READY ==="
STATUS_RES2=$(curl -s -X GET http://localhost/api/applications/$APP_ID \
  -H "Authorization: Bearer $TOKEN")
NEW_STATUS=$(echo $STATUS_RES2 | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -n 1)
EXTRACTED_EMAIL=$(echo $STATUS_RES2 | grep -o '"candidateEmail":"[^"]*' | grep -o '[^"]*$' | head -n 1)
EXTRACTED_NAME=$(echo $STATUS_RES2 | grep -o '"candidateName":"[^"]*' | grep -o '[^"]*$' | head -n 1)
echo "Trạng thái mới: $NEW_STATUS"
echo "Email trích xuất được: $EXTRACTED_EMAIL"
echo "Tên trích xuất được: $EXTRACTED_NAME"

echo ""
echo "=== 7. Gửi email mời phỏng vấn (Magic Link) ==="
INVITE_RES=$(curl -s -X POST http://localhost/api/applications/$APP_ID/invite \
  -H "Authorization: Bearer $TOKEN")

STATUS_RES3=$(curl -s -X GET http://localhost/api/applications/$APP_ID \
  -H "Authorization: Bearer $TOKEN")
FINAL_STATUS=$(echo $STATUS_RES3 | grep -o '"status":"[^"]*' | grep -o '[^"]*$' | head -n 1)
MAGIC_TOKEN=$(echo $STATUS_RES3 | grep -o '"magicLinkToken":"[^"]*' | grep -o '[^"]*$' | head -n 1)
echo "Trạng thái cuối cùng: $FINAL_STATUS"
echo "Magic Link Token: $MAGIC_TOKEN"
echo "Magic Link URL: https://app.com/interview/$MAGIC_TOKEN"

# Clean up
rm mock_cv.pdf
echo ""
echo "=== Hoàn thành test flow Step 02! ==="
