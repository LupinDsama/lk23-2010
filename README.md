# Một chút dịu dàng — 20/10

Website chúc mừng 20/10 theo phong cách cute pastel, xây dựng bằng React, Vite và GSAP.

## Yêu cầu
- Node.js 18+ (khuyến nghị Node.js 20+)
- npm

## Chạy local

```bash
npm install
npm run dev
```

Mở URL Vite in ra trong terminal.

## Build production

```bash
npm run build
npm run preview
```

Thư mục triển khai sau build là `dist/`.

## Triển khai
Có thể deploy như một static site trên Cloudflare Pages, Netlify hoặc Vercel:
- Build command: `npm run build`
- Output directory: `dist`

## Tính năng
- Mở đầu tương tác.
- Timeline nhiều cảnh dùng GSAP.
- Cảnh hoa, lá thư và lời chúc cuối.
- Âm thanh tổng hợp nhẹ bằng Web Audio API; chỉ bắt đầu khi người dùng bấm nút âm thanh.
- Skip, replay và phím Escape để bỏ qua khi timeline đang chạy.
- Responsive cho mobile và desktop.
- Tôn trọng `prefers-reduced-motion`.

## Lưu ý
- Âm thanh là giai điệu tổng hợp tối giản tạo trực tiếp trên trình duyệt, không cần file nhạc ngoài.
- Font Google Fonts cần kết nối Internet; website vẫn có font dự phòng nếu không tải được.
- Kiểm tra build và thử trên trình duyệt mục tiêu trước khi gửi đường dẫn công khai.
