# Chạy dự án trên Windows 10/11

1. Cài **Node.js 22 LTS** và **Docker Desktop**. Đảm bảo Docker Desktop đang mở.
2. Giải nén source code, mở thư mục `vinmec-dss` bằng VS Code.
3. Mở terminal PowerShell tại thư mục gốc, chạy:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

4. Mở `apps/api/.env`, thay giá trị `JWT_SECRET` bằng chuỗi ngẫu nhiên dài ít nhất 32 ký tự. Không nhập API key OpenAI ngay nếu chỉ muốn thử DSS không AI.
5. Chạy lần lượt:

```powershell
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

6. Mở terminal 1:

```powershell
npm run dev:api
```

7. Mở terminal 2:

```powershell
npm run dev:web
```

8. Truy cập `http://localhost:5173`. Đăng nhập tài khoản `manager@demo.local`, mật khẩu demo mặc định `VinmecDemo2026!`. Đây chỉ là tài khoản dùng trên máy local.
9. Tạo kịch bản `baseline = 200`, `growth = 30%`, bấm **Analyze & save**. Sau đó thử **Approve selection**.
10. Nếu muốn dùng OpenAI, thêm `OPENAI_API_KEY` vào `apps/api/.env`, khởi động lại terminal Backend rồi bấm **Generate explanation**.

**Lưu ý:** Không upload file `.env`, không gửi API key hoặc mật khẩu thật vào chat, và không mở dịch vụ lên internet với tài khoản demo mặc định.